import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildDocumentChatMessages } from "@/lib/chatPrompts";
import { buildSearchChunks, searchRelevantChunks, sourceQuote } from "@/lib/documentSearch";
import { isValidDocumentId, readParsedDocument, saveParsedDocument } from "@/lib/documentStorage";
import { chatCompletionText, toPublicLlmError } from "@/lib/llmClient";
import type { ChatSource, DocumentChatMessage } from "@/lib/documentTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shortQuestion(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    const document = await readParsedDocument(id);
    return NextResponse.json({ ok: true, messages: document.chatMessages ?? [] });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "文档不存在。" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "读取聊天记录失败。" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { question?: unknown };
    const question = shortQuestion(body.question);
    if (!question) {
      return NextResponse.json({ ok: false, error: "问题不能为空。" }, { status: 400 });
    }

    const document = await readParsedDocument(id);
    if (!document.text?.trim()) {
      return NextResponse.json({ ok: false, error: "文档文本为空，无法问答。" }, { status: 422 });
    }

    const searchChunks = buildSearchChunks(document.text);
    const relevantChunks = searchRelevantChunks(question, searchChunks);
    if (!relevantChunks.length) {
      return NextResponse.json({ ok: false, error: "未找到可用于回答的文档片段。" }, { status: 422 });
    }

    const result = await chatCompletionText({
      messages: buildDocumentChatMessages(question, relevantChunks, document.title),
      temperature: 0.2,
      maxTokens: 1200
    });

    const answer = result.text.trim();
    if (!answer) {
      return NextResponse.json({ ok: false, error: "模型返回为空，请稍后重试。" }, { status: 502 });
    }

    const sources: ChatSource[] = relevantChunks.map((chunk) => ({
      sourceHint: chunk.sourceHint,
      quote: sourceQuote(chunk.text),
      startChar: chunk.startChar,
      endChar: chunk.endChar
    }));

    const now = new Date().toISOString();
    const userMessage: DocumentChatMessage = {
      id: `chat_${randomUUID()}`,
      role: "user",
      content: question,
      createdAt: now
    };
    const assistantMessage: DocumentChatMessage = {
      id: `chat_${randomUUID()}`,
      role: "assistant",
      content: answer,
      createdAt: now,
      sources
    };

    try {
      await saveParsedDocument({
        ...document,
        chatMessages: [...(document.chatMessages ?? []), userMessage, assistantMessage].slice(-80)
      });
    } catch {
      return NextResponse.json({ ok: false, error: "保存聊天记录失败。" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      answer,
      sources
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "文档不存在。" }, { status: 404 });
    }

    const publicError = toPublicLlmError(error);
    return NextResponse.json({ ok: false, error: publicError.message }, { status: publicError.status });
  }
}
