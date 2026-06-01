import type { DocumentAnalysis } from "./documentTypes";

type RawAnalysis = Partial<DocumentAnalysis> & {
  title?: unknown;
  documentType?: unknown;
  language?: unknown;
  oneSentenceSummary?: unknown;
  summary?: unknown;
  keyPoints?: unknown;
  keywords?: unknown;
  sectionSummaries?: unknown;
  translationZh?: unknown;
  pptOutline?: unknown;
  podcastScript?: unknown;
  imagePrompts?: unknown;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function objectRecord(value: unknown) {
  return typeof value === "object" && value ? (value as Record<string, unknown>) : {};
}

export function normalizeLlmAnalysis(raw: RawAnalysis, fallback: DocumentAnalysis): DocumentAnalysis {
  const sectionSummaries = Array.isArray(raw.sectionSummaries)
    ? raw.sectionSummaries.map((item) => {
        const record = objectRecord(item);
        return {
          title: stringValue(record.title),
          summary: stringValue(record.summary),
          keyPoints: stringArray(record.keyPoints),
          quotes: stringArray(record.quotes),
          sourceHint: stringValue(record.sourceHint)
        };
      })
    : [];

  const pptOutline = Array.isArray(raw.pptOutline)
    ? raw.pptOutline.map((item) => {
        const record = objectRecord(item);
        return {
          title: stringValue(record.title),
          bullets: stringArray(record.bullets)
        };
      })
    : [];

  const imagePrompts = Array.isArray(raw.imagePrompts)
    ? raw.imagePrompts.map((item) => {
        const record = objectRecord(item);
        return {
          title: stringValue(record.title),
          prompt: stringValue(record.prompt)
        };
      })
    : [];

  return {
    title: stringValue(raw.title),
    documentType: stringValue(raw.documentType) || fallback.documentType || "",
    language: stringValue(raw.language) || fallback.language || "",
    oneSentenceSummary: stringValue(raw.oneSentenceSummary) || fallback.oneSentenceSummary || "",
    summary: stringValue(raw.summary),
    keyPoints: stringArray(raw.keyPoints),
    keywords: stringArray(raw.keywords),
    sectionSummaries,
    translationZh: stringValue(raw.translationZh),
    pptOutline,
    podcastScript: stringValue(raw.podcastScript),
    imagePrompts
  };
}
