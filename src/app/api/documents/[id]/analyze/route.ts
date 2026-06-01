import { NextResponse } from "next/server";
import { buildDocumentAnalysisMessages, buildJsonRepairMessages, getAnalysisTextSlice } from "@/lib/analysisPrompts";
import { normalizeLlmAnalysis } from "@/lib/analysisResult";
import { isValidDocumentId, readParsedDocument, saveParsedDocument } from "@/lib/documentStorage";
import { createJsonChatCompletion, toPublicLlmError } from "@/lib/llmClient";
import type { AnalysisDiagnostics, DocumentAnalysis, ParsedDocument } from "@/lib/documentTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shortError(error: string) {
  return error.slice(0, 300);
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let document: ParsedDocument | undefined;
  let inputChars = 0;
  let analysisTruncated = false;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    document = await readParsedDocument(id);
    if (!document.text?.trim()) {
      const failedDiagnostics: AnalysisDiagnostics = {
        parserStrategy: "failed",
        repairedJson: false,
        errorType: "empty_document"
      };
      await saveParsedDocument({
        ...document,
        analysisStatus: "failed",
        analysisError: "文档文本为空，无法分析。",
        analysisDiagnostics: failedDiagnostics
      });
      return NextResponse.json({ ok: false, error: "文档文本为空，无法分析。" }, { status: 422 });
    }

    const slice = getAnalysisTextSlice(document.text);
    inputChars = slice.analyzedTextLength;
    analysisTruncated = slice.isPartialAnalysis;

    const messages = buildDocumentAnalysisMessages(document.title, document.text);
    const result = await createJsonChatCompletion<Partial<DocumentAnalysis>>({
      messages,
      repairMessages: buildJsonRepairMessages,
      temperature: 0.2,
      maxTokens: 5000
    });
    const analysis = normalizeLlmAnalysis(result.data, document.analysis);

    const diagnostics: AnalysisDiagnostics = {
      ...result.diagnostics,
      provider: result.provider,
      model: result.model,
      inputChars,
      repairedJson: Boolean(result.diagnostics.repairedJson),
      rawPreview: result.diagnostics.rawPreview?.slice(0, 300)
    };

    const updatedDocument: ParsedDocument = {
      ...document,
      analysis: {
        ...analysis,
        analyzedTextLength: inputChars,
        isPartialAnalysis: analysisTruncated
      },
      analysisStatus: "completed",
      analyzedAt: new Date().toISOString(),
      analysisError: undefined,
      analysisInputChars: inputChars,
      analysisModel: result.model,
      analysisProvider: result.provider,
      analysisTruncated,
      analysisDiagnostics: diagnostics
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
      analysisTruncated: updatedDocument.analysisTruncated,
      analysisDiagnostics: updatedDocument.analysisDiagnostics
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "文档不存在。" }, { status: 404 });
    }

    const publicError = toPublicLlmError(error);

    if (document) {
      const failedDiagnostics: AnalysisDiagnostics = {
        parserStrategy: "failed",
        repairedJson: false,
        provider: document.analysisProvider,
        model: document.analysisModel,
        inputChars,
        errorType: publicError.errorType,
        rawPreview: publicError.rawPreview?.slice(0, 300)
      };

      try {
        await saveParsedDocument({
          ...document,
          analysisStatus: "failed",
          analysisError: shortError(publicError.message),
          analysisInputChars: inputChars || document.analysisInputChars,
          analysisTruncated,
          analysisDiagnostics: failedDiagnostics
        });
      } catch {
        // Keep the original LLM error visible; do not expose local write details here.
      }
    }

    return NextResponse.json({ ok: false, error: publicError.message }, { status: publicError.status });
  }
}
