import { ensureDocumentStructure } from "./documentStructure";
import { flattenOutline } from "./outlineExtractor";
import { getEffectiveOutline } from "./outlineUtils";
import type { DocumentOutlineNode, ParsedDocument, ParsedParagraph } from "./documentTypes";

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
  outlineNodeId?: string;
  outlineTitle?: string;
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
    const outlineChunks = chunkByOutline(structured, { targetSize, maxSize });
    return outlineChunks.length ? outlineChunks : chunkParagraphs(structured.paragraphs, { targetSize, maxSize });
  }

  const normalized = input.replace(/\r\n/g, "\n").trim();

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
      end = breakAt > 0 ? start + Math.floor(targetSize * 0.65) + breakAt : hardEnd;
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

function chunkByOutline(document: ParsedDocument, options: Required<Pick<ChunkOptions, "targetSize" | "maxSize">>): TextChunk[] {
  const structured = ensureDocumentStructure(document);
  const outlineNodes = flattenOutline(getEffectiveOutline(structured)).filter((node) => node.startParagraphId);
  if (!outlineNodes.length) return [];

  const skippedLowValueParagraphCount = structured.paragraphs.filter((paragraph) => shouldSkipParagraphForChunking(paragraph)).length;
  const sourceParagraphs = structured.paragraphs.filter((paragraph) => !shouldSkipParagraphForChunking(paragraph));
  const paragraphBase = sourceParagraphs.length ? sourceParagraphs : structured.paragraphs;
  const chunks: TextChunk[] = [];

  for (const outlineNode of outlineNodes) {
    const startIndex = paragraphIndex(outlineNode.startParagraphId);
    const endIndex = paragraphIndex(outlineNode.endParagraphId) || startIndex;
    const sectionParagraphs = paragraphBase.filter((paragraph) => paragraph.index >= startIndex && paragraph.index <= endIndex);
    if (!sectionParagraphs.length) continue;

    const sectionLength = sectionParagraphs.reduce((sum, paragraph) => sum + paragraph.text.length + 2, 0);
    if (sectionLength <= options.maxSize) {
      chunks.push(buildParagraphChunk(sectionParagraphs, chunks.length + 1, skippedLowValueParagraphCount, outlineNode));
      continue;
    }

    chunks.push(...splitLongOutlineParagraphs(sectionParagraphs, options, skippedLowValueParagraphCount, outlineNode, chunks.length));
  }

  return chunks;
}

function chunkParagraphs(paragraphs: ParsedParagraph[], options: Required<Pick<ChunkOptions, "targetSize" | "maxSize">>): TextChunk[] {
  if (!paragraphs.length) return [];
  const skippedLowValueParagraphCount = paragraphs.filter((paragraph) => shouldSkipParagraphForChunking(paragraph)).length;
  const sourceParagraphs = paragraphs.filter((paragraph) => !shouldSkipParagraphForChunking(paragraph));
  const chunkableParagraphs = sourceParagraphs.length ? sourceParagraphs : paragraphs;

  return splitParagraphsIntoChunks(chunkableParagraphs, options, skippedLowValueParagraphCount);
}

function splitLongOutlineParagraphs(
  paragraphs: ParsedParagraph[],
  options: Required<Pick<ChunkOptions, "targetSize" | "maxSize">>,
  skippedLowValueParagraphCount: number,
  outlineNode: DocumentOutlineNode,
  currentChunkCount: number
) {
  return splitParagraphsIntoChunks(paragraphs, options, skippedLowValueParagraphCount, outlineNode, currentChunkCount);
}

function splitParagraphsIntoChunks(
  paragraphs: ParsedParagraph[],
  options: Required<Pick<ChunkOptions, "targetSize" | "maxSize">>,
  skippedLowValueParagraphCount: number,
  outlineNode?: DocumentOutlineNode,
  currentChunkCount = 0
) {
  const chunks: TextChunk[] = [];
  let current: ParsedParagraph[] = [];
  let currentLength = 0;

  for (const paragraph of paragraphs) {
    const nextLength = currentLength + paragraph.text.length + 2;
    if (current.length && nextLength > options.targetSize) {
      chunks.push(buildParagraphChunk(current, currentChunkCount + chunks.length + 1, skippedLowValueParagraphCount, outlineNode));
      current = [];
      currentLength = 0;
    }

    current.push(paragraph);
    currentLength += paragraph.text.length + 2;

    if (currentLength >= options.maxSize) {
      chunks.push(buildParagraphChunk(current, currentChunkCount + chunks.length + 1, skippedLowValueParagraphCount, outlineNode));
      current = [];
      currentLength = 0;
    }
  }

  if (current.length) {
    chunks.push(buildParagraphChunk(current, currentChunkCount + chunks.length + 1, skippedLowValueParagraphCount, outlineNode));
  }

  return chunks;
}

function buildParagraphChunk(paragraphs: ParsedParagraph[], index: number, skippedLowValueParagraphCount = 0, outlineNode?: DocumentOutlineNode): TextChunk {
  const first = paragraphs[0];
  const last = paragraphs[paragraphs.length - 1];
  const startPage = first.pageNumber;
  const endPage = last.pageNumber;
  const baseSourceHint =
    startPage && endPage
      ? startPage === endPage
        ? `第 ${startPage} 页 · 第 ${first.index}-${last.index} 段`
        : `第 ${startPage}-${endPage} 页 · 第 ${first.index}-${last.index} 段`
      : `第 ${first.index}-${last.index} 段`;
  const sourceHint = outlineNode?.title ? `${outlineNode.title} · ${baseSourceHint}` : baseSourceHint;

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
    outlineNodeId: outlineNode?.id,
    outlineTitle: outlineNode?.title,
    skippedLowValueParagraphCount
  };
}

function shouldSkipParagraphForChunking(paragraph: ParsedParagraph) {
  const quality = paragraph.quality;
  return Boolean(quality?.isPageNumberOnly || quality?.isRepeatedHeaderFooter || (quality?.isVeryShort && quality.isLowValue));
}

function paragraphIndex(id?: string) {
  const match = id?.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}
