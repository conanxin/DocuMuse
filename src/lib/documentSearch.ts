export type SearchChunk = {
  id: string;
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
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: SearchChunk[] = [];
  let cursor = 0;
  let buffer = "";
  let startChar = 0;

  const flush = () => {
    const clean = normalizeText(buffer);
    if (!clean) return;
    const index = chunks.length + 1;
    chunks.push({
      id: `search_${index}`,
      index,
      text: clean,
      startChar,
      endChar: startChar + buffer.length,
      sourceHint: `第 ${index} 段`
    });
    buffer = "";
  };

  for (const paragraph of paragraphs.length ? paragraphs : [normalized]) {
    const paragraphStart = normalized.indexOf(paragraph, cursor);
    if (!buffer) startChar = paragraphStart >= 0 ? paragraphStart : cursor;
    if ((buffer + "\n\n" + paragraph).length > 1500) {
      flush();
      startChar = paragraphStart >= 0 ? paragraphStart : cursor;
      buffer = paragraph;
    } else {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    }

    while (buffer.length > 1600) {
      const slice = buffer.slice(0, 1200);
      const index = chunks.length + 1;
      chunks.push({
        id: `search_${index}`,
        index,
        text: normalizeText(slice),
        startChar,
        endChar: startChar + slice.length,
        sourceHint: `第 ${index} 段`
      });
      startChar += 1200;
      buffer = buffer.slice(1200);
    }

    cursor = (paragraphStart >= 0 ? paragraphStart : cursor) + paragraph.length;
  }

  flush();
  return chunks;
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
