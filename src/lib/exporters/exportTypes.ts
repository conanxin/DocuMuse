import type { ChunkAnalysis, DocumentChatMessage, DocumentOutlineNode, OutlineDiagnostics, ParsedDocument, ParseDiagnostics } from "../documentTypes";

export type DocumentExportOptions = {
  includeChat: boolean;
  includeCreative: boolean;
  includeChunks: boolean;
  only?: "chat";
};

export type PptxThemeName = "blue" | "green" | "purple" | "slate";
export type PptxCoverStyle = "standard" | "minimal" | "report";
export type ExportPresetId = "study-notes" | "presentation-pack" | "research-digest" | "podcast-prep" | "full-archive";

export interface PptxExportOptions {
  theme: PptxThemeName;
  cover: PptxCoverStyle;
  includeSummary: boolean;
  includeKeyPoints: boolean;
  includeKeywords: boolean;
  includeSections: boolean;
  includeOutline: boolean;
  includeCreative: boolean;
  includeChat: boolean;
}

export type SafeExportSource = {
  sourceHint: string;
  quote: string;
  anchorId?: string;
  outlineTitle?: string;
  outlineType?: DocumentOutlineNode["type"];
};

export type SafeExportChatMessage = {
  role: DocumentChatMessage["role"];
  content: string;
  createdAt: string;
  sources?: SafeExportSource[];
};

export type SafeExportChunkAnalysis = Pick<ChunkAnalysis, "chunkId" | "title" | "summary" | "keyPoints" | "keywords" | "quotes" | "sourceHint">;

export type SafeExportOutlineNode = Omit<DocumentOutlineNode, "children"> & {
  children?: SafeExportOutlineNode[];
};

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
    parseDiagnostics?: Pick<
      ParseDiagnostics,
      | "parser"
      | "parsedAt"
      | "pageCount"
      | "textLength"
      | "paragraphCount"
      | "sectionCount"
      | "averageCharsPerPage"
      | "emptyPageCount"
      | "suspectedScannedPdf"
      | "hasVeryShortText"
      | "warnings"
      | "qualityScore"
      | "qualityLabel"
      | "repeatedLineCandidates"
      | "suspectedHeaderFooterLines"
      | "suspectedReferenceSection"
      | "suspectedFootnoteCount"
      | "headingCandidateCount"
      | "languageGuess"
      | "lowValueParagraphCount"
      | "repeatedHeaderFooterParagraphCount"
      | "pageNumberParagraphCount"
    > & {
      lowTextDensityPageCount?: number;
      pageDiagnostics?: NonNullable<ParseDiagnostics["pageDiagnostics"]>;
    };
    coordinateDiagnostics?: ParsedDocument["coordinateDiagnostics"];
    outlineDiagnostics?: OutlineDiagnostics;
    outlineEditState?: {
      mode: "auto" | "custom";
      updatedAt?: string;
      customOutlineNodeCount: number;
      hiddenNodeCount: number;
      manualNodeCount: number;
      note?: string;
    };
  };
  outline?: SafeExportOutlineNode[];
  effectiveOutline?: SafeExportOutlineNode[];
  paragraphPositions?: Array<{
    paragraphId: string;
    pageNumber: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: "high" | "medium" | "low";
  }>;
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

export type ExportFormat = "markdown" | "json" | "pptx";

export type PresetExportFileFormat = ExportFormat | "chat-markdown";

export type PresetExportFile = {
  format: PresetExportFileFormat;
  filename: string;
  url: string;
};

export type ExportPresetPlan = {
  presetId: ExportPresetId;
  label: string;
  description: string;
  files: PresetExportFile[];
};
