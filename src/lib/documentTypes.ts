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

export type ParsedDocument = {
  id: string;
  title: string;
  filename: string;
  fileType: "pdf";
  createdAt: string;
  status: "parsed";
  analysisStatus?: "idle" | "analyzing" | "completed" | "failed";
  analyzedAt?: string;
  analysisError?: string;
  text: string;
  pageCount: number;
  uploadPath?: string;
  metadata: Record<string, unknown>;
  analysis: DocumentAnalysis;
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
