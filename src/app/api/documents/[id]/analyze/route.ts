import { NextResponse } from "next/server";
import { buildDocumentAnalysisMessages, getAnalysisTextSlice } from "@/lib/analysisPrompts";
import { normalizeLlmAnalysis } from "@/lib/analysisResult";
import { isValidDocumentId, readParsedDocument, saveParsedDocument } from "@/lib/documentStorage";
import { createJsonChatCompletion, toPublicLlmError } from "@/lib/llmClient";
import type { DocumentAnalysis, ParsedDocument } from "@/lib/documentTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shortError(error: string) {
  return error.slice(0, 300);
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let document: ParsedDocument | undefined;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    document = await readParsedDocument(id);
    if (!document.text?.trim()) {
      await saveParsedDocument({
        ...document,
        analysisStatus: "failed",
        analysisError: "文档文本为空，无法分析。"
      });
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

    const updatedDocument: ParsedDocument = {
      ...document,
      analysis: {
        ...analysis,
        analyzedTextLength: slice.analyzedTextLength,
        isPartialAnalysis: slice.isPartialAnalysis
      },
      analysisStatus: "completed",
      analyzedAt: new Date().toISOString(),
      analysisError: undefined,
      analysisInputChars: slice.analyzedTextLength,
      analysisModel: result.model,
      analysisProvider: result.provider,
      analysisTruncated: slice.isPartialAnalysis
    };

    await saveParsedDocument(updatedDocument);

    return NextResponse.json({
      ok: true,
      documentId: id,
      analysis: updatedDocument.analysis,
      analysisStatus: updatedDocument.analysisStatus,
      analyzedAt: updatedDocument.analyzedAt,
      analysisInputChars: updatedDocument.analysisInputChars,
      analysisModel: updatedDocument.analysisModel,
      analysisProvider: updatedDocument.analysisProvider,
      analysisTruncated: updatedDocument.analysisTruncated
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "文档不存在。" }, { status: 404 });
    }

    const publicError = toPublicLlmError(error);

    if (document) {
      try {
        await saveParsedDocument({
          ...document,
          analysisStatus: "failed",
          analysisError: shortError(publicError.message)
        });
      } catch {
        // Keep the original LLM error visible; do not expose local write details here.
      }
    }

    return NextResponse.json({ ok: false, error: publicError.message }, { status: publicError.status });
  }
}
