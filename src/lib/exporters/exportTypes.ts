import type { ChunkAnalysis, DocumentChatMessage, ParsedDocument } from "../documentTypes";

export type DocumentExportOptions = {
  includeChat: boolean;
  includeCreative: boolean;
  includeChunks: boolean;
  only?: "chat";
};

export type SafeExportSource = {
  sourceHint: string;
  quote: string;
  anchorId?: string;
};

export type SafeExportChatMessage = {
  role: DocumentChatMessage["role"];
  content: string;
  createdAt: string;
  sources?: SafeExportSource[];
};

export type SafeExportChunkAnalysis = Pick<ChunkAnalysis, "chunkId" | "title" | "summary" | "keyPoints" | "keywords" | "quotes" | "sourceHint">;

export type SafeDocumentExport = {
  exportedAt: string;
  metadata: {
    id: string;
    title: string;
    filename: string;
    fileType: ParsedDocument["fileType"];
    createdAt: string;
    pageCount: number;
    textLength: number;
    analysisStatus?: ParsedDocument["analysisStatus"];
    analysisMode?: ParsedDocument["analysisMode"];
    analysisProvider?: string;
    analysisModel?: string;
    analyzedAt?: string;
  };
  analysis?: {
    oneSentenceSummary: string;
    summary: string;
    keyPoints: string[];
    keywords: string[];
    documentType: string;
    language: string;
    translationZh?: string;
    sectionSummaries: Array<{
      title: string;
      summary: string;
      keyPoints: string[];
      quotes: string[];
      sourceHint?: string;
    }>;
    pptOutline?: Array<{
      title: string;
      bullets: string[];
    }>;
    podcastScript?: string;
    imagePrompts?: Array<{
      title: string;
      prompt: string;
    }>;
  };
  chunkAnalysis?: {
    analysisMode?: ParsedDocument["analysisMode"];
    chunkCount: number;
    chunkAnalyses: SafeExportChunkAnalysis[];
  };
  chatMessages?: SafeExportChatMessage[];
};

export type ExportFormat = "markdown" | "json";
