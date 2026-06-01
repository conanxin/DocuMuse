import { buildParagraphAnchors } from "./sourceAnchors";

export type SearchChunk = {
  id: string;
  anchorId?: string;
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  sourceHint: string;
  score?: number;
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function tokenize(input: string) {
  const lower = input.toLowerCase();
  const english = lower.match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  const chinese = lower.match(/[\u4e00-\u9fff]{1,4}/g) ?? [];
  const chineseChars = Array.from(lower.matchAll(/[\u4e00-\u9fff]/g)).map((match) => match[0]);
  return Array.from(new Set([...english, ...chinese, ...chineseChars])).filter((token) => token.trim().length > 0);
}

export function buildSearchChunks(text: string): SearchChunk[] {
  return buildParagraphAnchors(text).map((anchor) => ({
    id: `search_${anchor.id}`,
    anchorId: anchor.id,
    index: anchor.index,
    text: normalizeText(anchor.text),
    startChar: anchor.startChar,
    endChar: anchor.endChar,
    sourceHint: anchor.sourceHint
  }));
}

export function searchRelevantChunks(question: string, chunks: SearchChunk[]) {
  const tokens = tokenize(question);
  if (!chunks.length) return [];

  const scored = chunks.map((chunk) => {
    const text = chunk.text.toLowerCase();
    const score = tokens.reduce((sum, token) => {
      if (!token) return sum;
      const matches = text.split(token).length - 1;
      return sum + matches * Math.max(1, token.length);
    }, 0);
    return { ...chunk, score };
  });

  const matched = scored
    .filter((chunk) => (chunk.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5);

  if (matched.length) return matched;
  return chunks.slice(0, 4).map((chunk) => ({ ...chunk, score: 0 }));
}

export function sourceQuote(text: string, maxLength = 300) {
  const clean = normalizeText(text);
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}
