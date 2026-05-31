import type { DocumentAnalysis } from "./documentTypes";

const fallbackKeywords = ["PDF", "文档解析", "文本提取", "DocuMuse"];

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map((paragraph) => normalizeText(paragraph))
    .filter((paragraph) => paragraph.length > 20);
}

function detectLanguage(text: string) {
  const chineseMatches = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const latinMatches = text.match(/[A-Za-z]/g)?.length ?? 0;
  if (chineseMatches > 80 || chineseMatches > latinMatches * 0.25) return "中文";
  if (latinMatches > 80) return "英文";
  return "未知";
}

function makeSectionSummaries(text: string) {
  const cleanText = normalizeText(text);
  if (!cleanText) return [];

  const sectionCount = Math.min(5, Math.max(3, Math.ceil(cleanText.length / 1800)));
  const sectionLength = Math.ceil(cleanText.length / sectionCount);

  return Array.from({ length: sectionCount }, (_, index) => {
    const slice = cleanText.slice(index * sectionLength, (index + 1) * sectionLength);
    return {
      title: `第 ${index + 1} 段`,
      summary: `这一段主要包含：${slice.slice(0, 90)}${slice.length > 90 ? "..." : ""}`
    };
  }).filter((section) => section.summary.length > 12);
}

function extractKeywords(text: string) {
  const words = text
    .toLowerCase()
    .match(/[a-zA-Z][a-zA-Z-]{3,}|[\u4e00-\u9fff]{2,}/g);

  if (!words) return fallbackKeywords;

  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }

  const keywords = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .filter((word) => word.length <= 18)
    .slice(0, 6);

  return keywords.length ? keywords : fallbackKeywords;
}

export function generateSimpleAnalysis(text: string): DocumentAnalysis {
  const cleanText = normalizeText(text);
  const paragraphs = splitParagraphs(text);
  const summaryText = cleanText.slice(0, 230);

  return {
    oneSentenceSummary: `这份文档主要讨论：${summaryText}${cleanText.length > summaryText.length ? "..." : ""}`,
    keyPoints: paragraphs.slice(0, 5).map((paragraph) => paragraph.slice(0, 160)),
    keywords: extractKeywords(text),
    documentType: "PDF 文档",
    language: detectLanguage(text),
    sectionSummaries: makeSectionSummaries(text)
  };
}
