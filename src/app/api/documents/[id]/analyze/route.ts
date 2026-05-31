import { NextResponse } from "next/server";
import { buildDocumentAnalysisMessages, getAnalysisTextSlice } from "@/lib/analysisPrompts";
import { normalizeLlmAnalysis } from "@/lib/analysisResult";
import { isValidDocumentId, readParsedDocument, saveParsedDocument } from "@/lib/documentStorage";
import { createJsonChatCompletion, toPublicLlmError } from "@/lib/llmClient";
import type { DocumentAnalysis } from "@/lib/documentTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    const document = await readParsedDocument(id);
    if (!document.text?.trim()) {
      return NextResponse.json({ ok: false, error: "文档文本为空，无法分析。" }, { status: 422 });
    }

    const slice = getAnalysisTextSlice(document.text);
    const messages = buildDocumentAnalysisMessages(document.title, document.text);
    const result = await createJsonChatCompletion<Partial<DocumentAnalysis>>({
      messages,
      temperature: 0.2,
      maxTokens: 5000
    });
    const analysis = normalizeLlmAnalysis(result.data, document.analysis);

    const updatedDocument = {
      ...document,
      analysis: {
        ...analysis,
        analyzedTextLength: slice.analyzedTextLength,
        isPartialAnalysis: slice.isPartialAnalysis
      },
      analysisStatus: "completed" as const,
      analyzedAt: new Date().toISOString(),
      analysisError: undefined
    };

    await saveParsedDocument(updatedDocument);

    return NextResponse.json({
      ok: true,
      documentId: id,
      analysis: updatedDocument.analysis,
      analyzedAt: updatedDocument.analyzedAt,
      analysisStatus: updatedDocument.analysisStatus
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
