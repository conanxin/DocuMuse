export type TextChunk = {
  id: string;
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  sourceHint: string;
};

type ChunkOptions = {
  targetSize?: number;
  maxSize?: number;
  overlap?: number;
};

export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const targetSize = options.targetSize ?? 7000;
  const maxSize = options.maxSize ?? 9000;
  const overlap = options.overlap ?? 400;
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized) return [];
  if (normalized.length <= maxSize) {
    return [
      {
        id: "chunk_1",
        index: 1,
        text: normalized,
        startChar: 0,
        endChar: normalized.length,
        sourceHint: "全文"
      }
    ];
  }

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < normalized.length) {
    const preferredEnd = Math.min(start + targetSize, normalized.length);
    const hardEnd = Math.min(start + maxSize, normalized.length);
    let end = preferredEnd;

    if (hardEnd < normalized.length) {
      const searchWindow = normalized.slice(start + Math.floor(targetSize * 0.65), hardEnd);
      const paragraphBreak = searchWindow.lastIndexOf("\n\n");
      const sentenceBreak = Math.max(searchWindow.lastIndexOf("。"), searchWindow.lastIndexOf("."), searchWindow.lastIndexOf("!"), searchWindow.lastIndexOf("?"));
      const breakAt = paragraphBreak >= 0 ? paragraphBreak + 2 : sentenceBreak >= 0 ? sentenceBreak + 1 : -1;
      if (breakAt > 0) {
        end = start + Math.floor(targetSize * 0.65) + breakAt;
      } else {
        end = hardEnd;
      }
    }

    const chunkTextValue = normalized.slice(start, end).trim();
    if (chunkTextValue) {
      const index = chunks.length + 1;
      chunks.push({
        id: `chunk_${index}`,
        index,
        text: chunkTextValue,
        startChar: start,
        endChar: end,
        sourceHint: `第 ${index} 块，字符 ${start + 1}-${end}`
      });
    }

    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}
