import type { DocumentChatMessage, ParsedDocument } from "../documentTypes";
import type { DocumentExportOptions, SafeDocumentExport, SafeExportChatMessage } from "./exportTypes";

const DEFAULT_OPTIONS: DocumentExportOptions = {
  includeChat: true,
  includeCreative: true,
  includeChunks: false
};

export function normalizeExportOptions(options: Partial<DocumentExportOptions> = {}): DocumentExportOptions {
  return {
    includeChat: options.includeChat ?? DEFAULT_OPTIONS.includeChat,
    includeCreative: options.includeCreative ?? DEFAULT_OPTIONS.includeCreative,
    includeChunks: options.includeChunks ?? DEFAULT_OPTIONS.includeChunks,
    only: options.only
  };
}

export function buildDocumentJsonExport(document: ParsedDocument, rawOptions: Partial<DocumentExportOptions> = {}): SafeDocumentExport {
  const options = normalizeExportOptions(rawOptions);
  const exportedAt = new Date().toISOString();

  const base: SafeDocumentExport = {
    exportedAt,
    metadata: {
      id: document.id,
      title: document.title,
      filename: document.filename,
      fileType: document.fileType,
      createdAt: document.createdAt,
      pageCount: document.pageCount,
      textLength: document.text?.length ?? 0,
      analysisStatus: document.analysisStatus,
      analysisMode: document.analysisMode,
      analysisProvider: document.analysisProvider,
      analysisModel: document.analysisModel,
      analyzedAt: document.analyzedAt,
      parseDiagnostics: safeParseDiagnostics(document.parseDiagnostics)
    }
  };

  if (options.only === "chat") {
    return {
      ...base,
      chatMessages: safeChatMessages(document.chatMessages ?? [])
    };
  }

  base.analysis = {
    oneSentenceSummary: asString(document.analysis?.oneSentenceSummary),
    summary: asString(document.analysis?.summary),
    keyPoints: asStringArray(document.analysis?.keyPoints),
    keywords: asStringArray(document.analysis?.keywords),
    documentType: asString(document.analysis?.documentType),
    language: asString(document.analysis?.language),
    translationZh: asOptionalString(document.analysis?.translationZh),
    sectionSummaries: (document.analysis?.sectionSummaries ?? []).map((section) => ({
      title: asString(section.title),
      summary: asString(section.summary),
      keyPoints: asStringArray(section.keyPoints),
      quotes: asStringArray(section.quotes).map((quote) => truncate(quote, 500)),
      sourceHint: asOptionalString(section.sourceHint)
    }))
  };

  if (options.includeCreative && base.analysis) {
    base.analysis.pptOutline = (document.analysis?.pptOutline ?? []).map((slide) => ({
      title: asString(slide.title),
      bullets: asStringArray(slide.bullets)
    }));
    base.analysis.podcastScript = asOptionalString(document.analysis?.podcastScript);
    base.analysis.imagePrompts = (document.analysis?.imagePrompts ?? []).map((item) => ({
      title: asString(item.title),
      prompt: asString(item.prompt)
    }));
  }

  if (options.includeChunks) {
    base.chunkAnalysis = {
      analysisMode: document.analysisMode,
      chunkCount: document.chunks?.length ?? document.chunkAnalyses?.length ?? 0,
      chunkAnalyses: (document.chunkAnalyses ?? []).map((chunk) => ({
        chunkId: asString(chunk.chunkId),
        title: asString(chunk.title),
        summary: asString(chunk.summary),
        keyPoints: asStringArray(chunk.keyPoints),
        keywords: asStringArray(chunk.keywords),
        quotes: asStringArray(chunk.quotes).map((quote) => truncate(quote, 500)),
        sourceHint: asString(chunk.sourceHint)
      }))
    };
  }

  if (options.includeChat) {
    base.chatMessages = safeChatMessages(document.chatMessages ?? []);
  }

  return base;
}

export function buildSafeExportFilename(document: Pick<ParsedDocument, "title" | "filename">, ext: string, prefix = "documuse") {
  const baseName = document.title || document.filename || "document";
  const safe = baseName
    .replace(/\.[A-Za-z0-9]+$/, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_")
    .replace(/\s+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${safe || "document"}.${ext.replace(/^\./, "")}`;
}

export function safeChatMessages(messages: DocumentChatMessage[]): SafeExportChatMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: truncate(asString(message.content), 4000),
      createdAt: asString(message.createdAt),
      sources: (message.sources ?? []).slice(0, 8).map((source) => ({
        sourceHint: asString(source.sourceHint),
        quote: truncate(asString(source.quote), 300),
        anchorId: asOptionalString(source.anchorId)
      }))
    }));
}

export function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function safeParseDiagnostics(diagnostics: ParsedDocument["parseDiagnostics"]) {
  if (!diagnostics) return undefined;
  return {
    parser: asString(diagnostics.parser),
    parsedAt: asString(diagnostics.parsedAt),
    pageCount: diagnostics.pageCount,
    textLength: diagnostics.textLength,
    paragraphCount: diagnostics.paragraphCount,
    sectionCount: diagnostics.sectionCount,
    averageCharsPerPage: diagnostics.averageCharsPerPage,
    emptyPageCount: diagnostics.emptyPageCount,
    suspectedScannedPdf: diagnostics.suspectedScannedPdf,
    hasVeryShortText: diagnostics.hasVeryShortText,
    warnings: asStringArray(diagnostics.warnings).map((warning) => truncate(warning, 240)),
    qualityScore: diagnostics.qualityScore,
    qualityLabel: diagnostics.qualityLabel,
    repeatedLineCandidates: asStringArray(diagnostics.repeatedLineCandidates).slice(0, 20).map((line) => truncate(line, 160)),
    suspectedHeaderFooterLines: asStringArray(diagnostics.suspectedHeaderFooterLines).slice(0, 20).map((line) => truncate(line, 160)),
    suspectedReferenceSection: diagnostics.suspectedReferenceSection,
    suspectedFootnoteCount: diagnostics.suspectedFootnoteCount,
    headingCandidateCount: diagnostics.headingCandidateCount,
    languageGuess: diagnostics.languageGuess,
    lowTextDensityPageCount: diagnostics.pageDiagnostics?.filter((page) => page.lowTextDensity).length,
    pageDiagnostics: diagnostics.pageDiagnostics?.slice(0, 80).map((page) => ({
      pageNumber: page.pageNumber,
      textLength: page.textLength,
      paragraphCount: page.paragraphCount,
      empty: page.empty,
      lowTextDensity: page.lowTextDensity,
      repeatedHeaderFooterCandidates: asStringArray(page.repeatedHeaderFooterCandidates).slice(0, 6).map((line) => truncate(line, 120))
    }))
  };
}
