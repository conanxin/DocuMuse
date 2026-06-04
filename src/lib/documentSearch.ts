import type { ParsedDocument } from "./documentTypes";
import { buildParagraphAnchors, buildParagraphAnchorsFromDocument } from "./sourceAnchors";

export type SearchChunk = {
  id: string;
  anchorId?: string;
  paragraphId?: string;
  pageNumber?: number;
  sectionId?: string;
  sectionTitle?: string;
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  sourceHint: string;
  score?: number;
  matchedTerms?: string[];
  retrievalReason?: string;
};

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "what",
  "which",
  "who",
  "how",
  "why",
  "are",
  "is",
  "was",
  "were",
  "有哪些",
  "什么",
  "如何",
  "为什么",
  "这篇",
  "文章",
  "文档",
  "帮我",
  "生成",
  "总结"
]);

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function tokenize(input: string) {
  const lower = input.toLowerCase();
  const english = lower.match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  const chinesePhrases = lower.match(/[\u4e00-\u9fff]{2,8}/g) ?? [];
  const chineseBigrams = chinesePhrases.flatMap((phrase) => Array.from({ length: Math.max(0, phrase.length - 1) }, (_, index) => phrase.slice(index, index + 2)));
  const chineseChars = Array.from(lower.matchAll(/[\u4e00-\u9fff]/g)).map((match) => match[0]);
  const tokens = unique([...english, ...chinesePhrases, ...chineseBigrams, ...chineseChars]);
  return tokens.filter((token) => !stopWords.has(token) && token.trim().length > 0);
}

export function buildSearchChunks(input: string | ParsedDocument): SearchChunk[] {
  const anchors = typeof input === "string" ? buildParagraphAnchors(input) : buildParagraphAnchorsFromDocument(input);
  return anchors.map((anchor) => ({
    id: `search_${anchor.id}`,
    anchorId: anchor.id,
    paragraphId: anchor.paragraphId,
    pageNumber: anchor.pageNumber,
    sectionId: anchor.sectionId,
    sectionTitle: anchor.sectionTitle,
    index: anchor.index,
    text: normalizeText(anchor.text),
    startChar: anchor.startChar,
    endChar: anchor.endChar,
    sourceHint: anchor.sourceHint
  }));
}

export function searchRelevantChunks(question: string, chunks: SearchChunk[], topK = 5) {
  const tokens = tokenize(question);
  const questionPhrase = normalizeText(question).toLowerCase();
  if (!chunks.length) return [];

  const scored = chunks.map((chunk) => scoreChunk(chunk, tokens, questionPhrase));
  const deduped = dedupeByText(scored)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const top = deduped.filter((chunk) => (chunk.score ?? 0) > 0).slice(0, topK);
  if (top.length >= 3) return top;

  const fallback = [...top];
  for (const chunk of chunks.slice(0, 4)) {
    if (!fallback.some((item) => item.id === chunk.id)) {
      fallback.push({ ...chunk, score: chunk.score ?? 0, matchedTerms: [], retrievalReason: "fallback_start" });
    }
    if (fallback.length >= Math.min(3, chunks.length)) break;
  }

  return fallback.length ? fallback : chunks.slice(0, Math.min(3, chunks.length)).map((chunk) => ({ ...chunk, score: 0, matchedTerms: [], retrievalReason: "fallback_start" }));
}

function scoreChunk(chunk: SearchChunk, tokens: string[], questionPhrase: string): SearchChunk {
  const text = chunk.text.toLowerCase();
  const sourceHint = `${chunk.sourceHint} ${chunk.sectionTitle ?? ""}`.toLowerCase();
  const matchedTerms: string[] = [];
  let score = 0;

  if (questionPhrase.length >= 6 && text.includes(questionPhrase)) {
    score += 30;
    matchedTerms.push(questionPhrase);
  }

  for (const token of tokens) {
    const textMatches = text.split(token).length - 1;
    const sourceMatches = sourceHint.includes(token) ? 1 : 0;
    if (textMatches || sourceMatches) {
      matchedTerms.push(token);
      score += textMatches * Math.max(2, token.length * 1.5);
      score += sourceMatches * 4;
    }
  }

  const coverage = matchedTerms.length / Math.max(1, tokens.length);
  score += coverage * 12;
  score += proximityBonus(text, unique(matchedTerms));
  score += densityBonus(score, chunk.text.length);
  if (chunk.text.length > 1400) score -= 2;

  return {
    ...chunk,
    score: Number(score.toFixed(2)),
    matchedTerms: unique(matchedTerms).slice(0, 12),
    retrievalReason: score > 0 ? (coverage > 0.5 ? "high_term_coverage" : "keyword_match") : "low_score"
  };
}

function proximityBonus(text: string, terms: string[]) {
  const positions = terms
    .map((term) => text.indexOf(term))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b);
  if (positions.length < 2) return 0;
  const span = positions[positions.length - 1] - positions[0];
  if (span < 120) return 8;
  if (span < 300) return 4;
  return 0;
}

function densityBonus(score: number, length: number) {
  if (!length) return 0;
  const density = score / Math.max(1, length / 500);
  return Math.min(8, density);
}

function dedupeByText(chunks: SearchChunk[]) {
  const seen = new Set<string>();
  return chunks.filter((chunk) => {
    const key = chunk.text.slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sourceQuote(text: string, maxLength = 180, terms: string[] = []) {
  const clean = normalizeText(text);
  const sentences = splitSentences(clean);
  const ranked = sentences
    .map((sentence) => ({
      sentence,
      score: terms.reduce((sum, term) => sum + (sentence.toLowerCase().includes(term.toLowerCase()) ? Math.max(1, term.length) : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score ? ranked[0].sentence : clean;
  return trimQuote(best, maxLength);
}

function splitSentences(text: string) {
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]?/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
  return sentences.length ? sentences : [text];
}

function trimQuote(text: string, maxLength: number) {
  const clean = normalizeText(text);
  if (clean.length <= maxLength) return clean;
  const minLength = Math.min(80, maxLength);
  const sliced = clean.slice(0, Math.max(minLength, maxLength));
  return `${sliced}...`;
}
