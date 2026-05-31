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

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

export function normalizeLlmAnalysis(raw: RawAnalysis, fallback: DocumentAnalysis): DocumentAnalysis {
  const sectionSummaries = Array.isArray(raw.sectionSummaries)
    ? raw.sectionSummaries.map((item, index) => {
        const record = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
        return {
          title: stringValue(record.title, `第 ${index + 1} 段`),
          summary: stringValue(record.summary, "文档中未明确说明。"),
          keyPoints: stringArray(record.keyPoints),
          quotes: stringArray(record.quotes),
          sourceHint: stringValue(record.sourceHint, "文档中未明确说明")
        };
      })
    : fallback.sectionSummaries;

  const pptOutline = Array.isArray(raw.pptOutline)
    ? raw.pptOutline.map((item, index) => {
        const record = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
        return {
          title: stringValue(record.title, `第 ${index + 1} 页`),
          bullets: stringArray(record.bullets)
        };
      })
    : undefined;

  const imagePrompts = Array.isArray(raw.imagePrompts)
    ? raw.imagePrompts.map((item, index) => {
        const record = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
        return {
          title: stringValue(record.title, `图片提示词 ${index + 1}`),
          prompt: stringValue(record.prompt, "A clean editorial illustration based on the document.")
        };
      })
    : undefined;

  return {
    title: stringValue(raw.title),
    documentType: stringValue(raw.documentType, fallback.documentType),
    language: stringValue(raw.language, fallback.language),
    oneSentenceSummary: stringValue(raw.oneSentenceSummary, fallback.oneSentenceSummary),
    summary: stringValue(raw.summary),
    keyPoints: stringArray(raw.keyPoints).length ? stringArray(raw.keyPoints) : fallback.keyPoints,
    keywords: stringArray(raw.keywords).length ? stringArray(raw.keywords) : fallback.keywords,
    sectionSummaries,
    translationZh: stringValue(raw.translationZh),
    pptOutline,
    podcastScript: stringValue(raw.podcastScript),
    imagePrompts
  };
}
