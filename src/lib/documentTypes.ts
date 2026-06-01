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
};

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
  uploadPath?: string;
  metadata: Record<string, unknown>;
  analysis: DocumentAnalysis;
  chunks?: TextChunkMetadata[];
  chunkAnalyses?: ChunkAnalysis[];
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
