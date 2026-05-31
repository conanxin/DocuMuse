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
  metadata: Record<string, unknown>;
  analysis: DocumentAnalysis;
};
