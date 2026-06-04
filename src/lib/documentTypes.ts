export type DocumentAnalysis = {
  title?: string;
  oneSentenceSummary: string;
  summary?: string;
  keyPoints: string[];
  keywords: string[];
  documentType: string;
  language: string;
  sectionSummaries: Array<{
    title: string;
    summary: string;
    keyPoints?: string[];
    quotes?: string[];
    sourceHint?: string;
  }>;
  translationZh?: string;
  pptOutline?: Array<{
    title: string;
    bullets: string[];
  }>;
  podcastScript?: string;
  imagePrompts?: Array<{
    title: string;
    prompt: string;
  }>;
  analyzedTextLength?: number;
  isPartialAnalysis?: boolean;
};

export type AnalysisDiagnostics = {
  parserStrategy?: "direct" | "code_block" | "brace_extract" | "repair" | "failed";
  repairedJson?: boolean;
  provider?: string;
  model?: string;
  inputChars?: number;
  outputChars?: number;
  errorType?: string;
  rawPreview?: string;
};

export type AnalysisMode = "quick" | "full";

export type AnalysisProgress = {
  step: "idle" | "chunking" | "chunk_analysis" | "synthesis" | "saving" | "completed" | "failed";
  totalChunks?: number;
  completedChunks?: number;
  currentChunk?: number;
  message?: string;
};

export type TextChunkMetadata = {
  id: string;
  index: number;
  startChar: number;
  endChar: number;
  sourceHint: string;
  paragraphIds?: string[];
  startPage?: number;
  endPage?: number;
  skippedLowValueParagraphCount?: number;
};

export interface ParsedPage {
  pageNumber: number;
  text: string;
  startChar: number;
  endChar: number;
  paragraphIds: string[];
}

export interface ParsedParagraph {
  id: string;
  index: number;
  pageNumber?: number;
  text: string;
  startChar: number;
  endChar: number;
  sourceHint: string;
  quality?: {
    isRepeatedHeaderFooter?: boolean;
    isPageNumberOnly?: boolean;
    isVeryShort?: boolean;
    isLikelyFootnote?: boolean;
    isLikelyReference?: boolean;
    isLowValue?: boolean;
    reasons?: string[];
  };
}

export interface ParsedSection {
  id: string;
  index: number;
  title: string;
  level: number;
  startParagraphId: string;
  endParagraphId?: string;
  startChar: number;
  endChar?: number;
  pageNumber?: number;
}

export interface ParseDiagnostics {
  parser: string;
  parsedAt: string;
  pageCount?: number;
  textLength: number;
  paragraphCount: number;
  sectionCount: number;
  averageCharsPerPage?: number;
  emptyPageCount?: number;
  suspectedScannedPdf?: boolean;
  hasVeryShortText?: boolean;
  warnings: string[];
  qualityScore?: number;
  qualityLabel?: "good" | "fair" | "poor" | "unknown";
  pageDiagnostics?: Array<{
    pageNumber: number;
    textLength: number;
    paragraphCount: number;
    empty?: boolean;
    lowTextDensity?: boolean;
    repeatedHeaderFooterCandidates?: string[];
  }>;
  repeatedLineCandidates?: string[];
  suspectedHeaderFooterLines?: string[];
  suspectedReferenceSection?: boolean;
  suspectedFootnoteCount?: number;
  headingCandidateCount?: number;
  languageGuess?: "zh" | "en" | "mixed" | "unknown";
  lowValueParagraphCount?: number;
  repeatedHeaderFooterParagraphCount?: number;
  pageNumberParagraphCount?: number;
}

export type ChunkAnalysis = {
  chunkId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  quotes: string[];
  entities: string[];
  sourceHint: string;
};

export type ChatSource = {
  anchorId?: string;
  paragraphId?: string;
  pageNumber?: number;
  sectionId?: string;
  sectionTitle?: string;
  qualityFlags?: string[];
  isLowValue?: boolean;
  sourceHint: string;
  quote: string;
  startChar: number;
  endChar: number;
  score?: number;
  matchedTerms?: string[];
  retrievalReason?: string;
};

export type DocumentChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: ChatSource[];
};

export type ParsedDocument = {
  id: string;
  title: string;
  filename: string;
  fileType: "pdf";
  createdAt: string;
  status: "parsed";
  analysisMode?: AnalysisMode;
  analysisStatus?: "idle" | "analyzing" | "running" | "completed" | "failed";
  analysisProgress?: AnalysisProgress;
  analyzedAt?: string;
  analysisError?: string;
  analysisInputChars?: number;
  analysisModel?: string;
  analysisProvider?: string;
  analysisTruncated?: boolean;
  analysisDiagnostics?: AnalysisDiagnostics;
  text: string;
  pageCount: number;
  pages?: ParsedPage[];
  paragraphs?: ParsedParagraph[];
  sections?: ParsedSection[];
  parseDiagnostics?: ParseDiagnostics;
  uploadPath?: string;
  metadata: Record<string, unknown>;
  analysis: DocumentAnalysis;
  chunks?: TextChunkMetadata[];
  chunkAnalyses?: ChunkAnalysis[];
  chatMessages?: DocumentChatMessage[];
};

export type DocumentListItem = {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  createdAt: string;
  status: string;
  pageCount: number;
  textLength: number;
  documentType: string;
  language: string;
};
