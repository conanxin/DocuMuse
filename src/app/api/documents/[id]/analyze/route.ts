import { NextResponse } from "next/server";
import { buildChunkAnalysisMessages, buildChunkJsonRepairMessages, buildDocumentAnalysisMessages, buildGlobalSynthesisMessages, buildJsonRepairMessages, getAnalysisTextSlice } from "@/lib/analysisPrompts";
import { normalizeLlmAnalysis } from "@/lib/analysisResult";
import { isValidDocumentId, readParsedDocument, saveParsedDocument } from "@/lib/documentStorage";
import { createJsonChatCompletion, toPublicLlmError } from "@/lib/llmClient";
import { chunkText } from "@/lib/textChunker";
import type { AnalysisDiagnostics, AnalysisMode, ChunkAnalysis, DocumentAnalysis, ParsedDocument } from "@/lib/documentTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shortError(error: string) {
  return error.slice(0, 300);
}

async function readMode(request: Request): Promise<AnalysisMode> {
  try {
    const body = (await request.json()) as { mode?: string };
    return body.mode === "quick" ? "quick" : "full";
  } catch {
    return "full";
  }
}

function chunkMetadata(chunks: ReturnType<typeof chunkText>) {
  return chunks.map(({ id, index, startChar, endChar, sourceHint, paragraphIds, startPage, endPage, outlineNodeId, outlineTitle, skippedLowValueParagraphCount }) => ({
    id,
    index,
    startChar,
    endChar,
    sourceHint,
    paragraphIds,
    startPage,
    endPage,
    outlineNodeId,
    outlineTitle,
    skippedLowValueParagraphCount
  }));
}

async function saveProgress(document: ParsedDocument, progress: ParsedDocument["analysisProgress"], extra: Partial<ParsedDocument> = {}) {
  await saveParsedDocument({
    ...document,
    ...extra,
    analysisStatus: "running",
    analysisProgress: progress
  });
}

async function runQuickAnalysis(document: ParsedDocument) {
  const slice = getAnalysisTextSlice(document.text);
  const result = await createJsonChatCompletion<Partial<DocumentAnalysis>>({
    messages: buildDocumentAnalysisMessages(document.title, document.text),
    repairMessages: buildJsonRepairMessages,
    temperature: 0.2,
    maxTokens: 5000
  });

  return {
    analysis: normalizeLlmAnalysis(result.data, document.analysis),
    model: result.model,
    provider: result.provider,
    diagnostics: result.diagnostics,
    inputChars: slice.analyzedTextLength,
    truncated: slice.isPartialAnalysis,
    chunks: undefined,
    chunkAnalyses: undefined
  };
}

async function runFullAnalysis(document: ParsedDocument) {
  const chunks = chunkText(document);
  await saveProgress(
    document,
    {
      step: "chunking",
      totalChunks: chunks.length,
      completedChunks: 0,
      message: `文本切分已完成，共 ${chunks.length} 段。`
    },
    {
      chunks: chunkMetadata(chunks),
      analysisMode: "full"
    }
  );

  const chunkAnalyses: ChunkAnalysis[] = [];
  let lastModel = "";
  let lastProvider = "";
  let repairedJson = false;

  for (const chunk of chunks) {
    await saveProgress(document, {
      step: "chunk_analysis",
      totalChunks: chunks.length,
      completedChunks: chunkAnalyses.length,
      currentChunk: chunk.index,
      message: `正在分析第 ${chunk.index} / ${chunks.length} 段。`
    }, { chunks: chunkMetadata(chunks), chunkAnalyses });

    const result = await createJsonChatCompletion<Partial<ChunkAnalysis>>({
      messages: buildChunkAnalysisMessages(chunk, document.title),
      repairMessages: buildChunkJsonRepairMessages,
      temperature: 0.2,
      maxTokens: 2200
    });
    lastModel = result.model;
    lastProvider = result.provider;
    repairedJson = repairedJson || Boolean(result.diagnostics.repairedJson);
    const raw = result.data;
    chunkAnalyses.push({
      chunkId: typeof raw.chunkId === "string" ? raw.chunkId : chunk.id,
      title: typeof raw.title === "string" ? raw.title : "",
      summary: typeof raw.summary === "string" ? raw.summary : "",
      keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints.filter((item): item is string => typeof item === "string") : [],
      keywords: Array.isArray(raw.keywords) ? raw.keywords.filter((item): item is string => typeof item === "string") : [],
      quotes: Array.isArray(raw.quotes) ? raw.quotes.filter((item): item is string => typeof item === "string") : [],
      entities: Array.isArray(raw.entities) ? raw.entities.filter((item): item is string => typeof item === "string") : [],
      sourceHint: typeof raw.sourceHint === "string" ? raw.sourceHint : chunk.sourceHint
    });

    await saveProgress(
      document,
      {
        step: "chunk_analysis",
        totalChunks: chunks.length,
        completedChunks: chunkAnalyses.length,
        currentChunk: chunk.index,
        message: `已完成第 ${chunk.index} / ${chunks.length} 段。`
      },
      {
        chunks: chunkMetadata(chunks),
        chunkAnalyses
      }
    );
  }

  await saveProgress(
    document,
    {
      step: "synthesis",
      totalChunks: chunks.length,
      completedChunks: chunks.length,
      message: "正在综合所有文本块。"
    },
    {
      chunks: chunkMetadata(chunks),
      chunkAnalyses
    }
  );

  const synthesis = await createJsonChatCompletion<Partial<DocumentAnalysis>>({
    messages: buildGlobalSynthesisMessages(chunkAnalyses, document.title),
    repairMessages: buildJsonRepairMessages,
    temperature: 0.2,
    maxTokens: 5000
  });

  return {
    analysis: normalizeLlmAnalysis(synthesis.data, document.analysis),
    model: synthesis.model || lastModel,
    provider: synthesis.provider || lastProvider,
    diagnostics: {
      ...synthesis.diagnostics,
      repairedJson: repairedJson || Boolean(synthesis.diagnostics.repairedJson)
    },
    inputChars: document.text.trim().length,
    truncated: false,
    chunks: chunkMetadata(chunks),
    chunkAnalyses
  };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let document: ParsedDocument | undefined;
  let mode: AnalysisMode = "full";
  let inputChars = 0;
  let analysisTruncated = false;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    mode = await readMode(request);
    document = await readParsedDocument(id);
    if (!document.text?.trim()) {
      const failedDiagnostics: AnalysisDiagnostics = {
        parserStrategy: "failed",
        repairedJson: false,
        errorType: "empty_document"
      };
      await saveParsedDocument({
        ...document,
        analysisMode: mode,
        analysisStatus: "failed",
        analysisError: "文档文本为空，无法分析。",
        analysisProgress: { step: "failed", message: "文档文本为空，无法分析。" },
        analysisDiagnostics: failedDiagnostics
      });
      return NextResponse.json({ ok: false, error: "文档文本为空，无法分析。" }, { status: 422 });
    }

    await saveParsedDocument({
      ...document,
      analysisMode: mode,
      analysisStatus: "running",
      analysisError: undefined,
      analysisProgress: {
        step: mode === "quick" ? "synthesis" : "chunking",
        message: mode === "quick" ? "正在进行快速分析。" : "正在切分全文。"
      }
    });

    const result = mode === "quick" ? await runQuickAnalysis(document) : await runFullAnalysis(document);
    inputChars = result.inputChars;
    analysisTruncated = result.truncated;

    const diagnostics: AnalysisDiagnostics = {
      ...result.diagnostics,
      provider: result.provider,
      model: result.model,
      inputChars,
      repairedJson: Boolean(result.diagnostics.repairedJson),
      rawPreview: result.diagnostics.rawPreview?.slice(0, 300)
    };

    await saveParsedDocument({
      ...document,
      analysis: {
        ...result.analysis,
        analyzedTextLength: inputChars,
        isPartialAnalysis: analysisTruncated
      },
      analysisMode: mode,
      analysisStatus: "completed",
      analysisProgress: {
        step: "completed",
        totalChunks: result.chunks?.length,
        completedChunks: result.chunks?.length,
        message: mode === "full" ? "完整分块分析已完成。" : "快速分析已完成。"
      },
      analyzedAt: new Date().toISOString(),
      analysisError: undefined,
      analysisInputChars: inputChars,
      analysisModel: result.model,
      analysisProvider: result.provider,
      analysisTruncated,
      analysisDiagnostics: diagnostics,
      chunks: result.chunks,
      chunkAnalyses: result.chunkAnalyses
    });

    return NextResponse.json({
      ok: true,
      documentId: id,
      analysisStatus: "completed",
      analysisMode: mode,
      analysisInputChars: inputChars,
      analysisModel: result.model,
      analysisProvider: result.provider,
      analysisTruncated,
      analysisDiagnostics: diagnostics
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
          analysisMode: mode,
          analysisStatus: "failed",
          analysisError: shortError(publicError.message),
          analysisProgress: {
            step: "failed",
            totalChunks: document.chunks?.length,
            completedChunks: document.chunkAnalyses?.length,
            message: shortError(publicError.message)
          },
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
