import { ensureDocumentStructure } from "./documentStructure";
import type { ParsedDocument, ParsedParagraph } from "./documentTypes";

export type TextChunk = {
  id: string;
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  sourceHint: string;
  paragraphIds?: string[];
  startPage?: number;
  endPage?: number;
  skippedLowValueParagraphCount?: number;
};

type ChunkOptions = {
  targetSize?: number;
  maxSize?: number;
  overlap?: number;
};

export function chunkText(input: string | ParsedDocument, options: ChunkOptions = {}): TextChunk[] {
  const targetSize = options.targetSize ?? 7000;
  const maxSize = options.maxSize ?? 9000;
  const overlap = options.overlap ?? 400;
  if (typeof input !== "string") {
    const structured = ensureDocumentStructure(input);
    return chunkParagraphs(structured.paragraphs, { targetSize, maxSize });
  }

  const text = input;
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

function chunkParagraphs(paragraphs: ParsedParagraph[], options: Required<Pick<ChunkOptions, "targetSize" | "maxSize">>): TextChunk[] {
  if (!paragraphs.length) return [];
  const skippedLowValueParagraphCount = paragraphs.filter((paragraph) => shouldSkipParagraphForChunking(paragraph)).length;
  const sourceParagraphs = paragraphs.filter((paragraph) => !shouldSkipParagraphForChunking(paragraph));
  const chunkableParagraphs = sourceParagraphs.length ? sourceParagraphs : paragraphs;

  const chunks: TextChunk[] = [];
  let current: ParsedParagraph[] = [];
  let currentLength = 0;

  for (const paragraph of chunkableParagraphs) {
    const nextLength = currentLength + paragraph.text.length + 2;
    if (current.length && nextLength > options.targetSize) {
      chunks.push(buildParagraphChunk(current, chunks.length + 1, skippedLowValueParagraphCount));
      current = [];
      currentLength = 0;
    }

    current.push(paragraph);
    currentLength += paragraph.text.length + 2;

    if (currentLength >= options.maxSize) {
      chunks.push(buildParagraphChunk(current, chunks.length + 1, skippedLowValueParagraphCount));
      current = [];
      currentLength = 0;
    }
  }

  if (current.length) {
    chunks.push(buildParagraphChunk(current, chunks.length + 1, skippedLowValueParagraphCount));
  }

  return chunks;
}

function buildParagraphChunk(paragraphs: ParsedParagraph[], index: number, skippedLowValueParagraphCount = 0): TextChunk {
  const first = paragraphs[0];
  const last = paragraphs[paragraphs.length - 1];
  const startPage = first.pageNumber;
  const endPage = last.pageNumber;
  const sourceHint =
    startPage && endPage
      ? startPage === endPage
        ? `第 ${startPage} 页 · 第 ${first.index}-${last.index} 段`
        : `第 ${startPage}-${endPage} 页 · 第 ${first.index}-${last.index} 段`
      : `第 ${first.index}-${last.index} 段`;

  return {
    id: `chunk_${index}`,
    index,
    text: paragraphs.map((paragraph) => paragraph.text).join("\n\n"),
    startChar: first.startChar,
    endChar: last.endChar,
    sourceHint,
    paragraphIds: paragraphs.map((paragraph) => paragraph.id),
    startPage,
    endPage,
    skippedLowValueParagraphCount
  };
}

function shouldSkipParagraphForChunking(paragraph: ParsedParagraph) {
  const quality = paragraph.quality;
  return Boolean(quality?.isPageNumberOnly || quality?.isRepeatedHeaderFooter || (quality?.isVeryShort && quality.isLowValue));
}
