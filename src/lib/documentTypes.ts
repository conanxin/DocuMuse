export type DocumentAnalysis = {
  oneSentenceSummary: string;
  keyPoints: string[];
  keywords: string[];
  documentType: string;
  language: string;
  sectionSummaries: Array<{
    title: string;
    summary: string;
  }>;
};

export type ParsedDocument = {
  id: string;
  title: string;
  filename: string;
  fileType: "pdf";
  createdAt: string;
  status: "parsed";
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
