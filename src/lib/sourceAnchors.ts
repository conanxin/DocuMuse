import { ensureDocumentStructure } from "./documentStructure";
import { flattenOutline } from "./outlineExtractor";
import type { DocumentOutlineNode, ParsedDocument } from "./documentTypes";
import { getEffectiveOutline } from "./outlineUtils";

export type ParagraphAnchor = {
  id: string;
  paragraphId?: string;
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  sourceHint: string;
  pageNumber?: number;
  sectionId?: string;
  sectionTitle?: string;
  outlineNodeId?: string;
  outlineTitle?: string;
  outlineType?: DocumentOutlineNode["type"];
  qualityFlags?: string[];
  isLowValue?: boolean;
  coordinateAvailable?: boolean;
  boundingBox?: NonNullable<ParsedDocument["paragraphPositions"]>[number]["boundingBox"];
  coordinateConfidence?: NonNullable<ParsedDocument["paragraphPositions"]>[number]["confidence"];
};

const MAX_ANCHOR_CHARS = 1600;
const TARGET_SPLIT_CHARS = 1300;

export function buildParagraphAnchors(text: string): ParagraphAnchor[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const roughParagraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 8);

  const sourceParagraphs = roughParagraphs.length ? roughParagraphs : [normalized.trim()].filter(Boolean);
  const anchors: ParagraphAnchor[] = [];
  let cursor = 0;

  for (const paragraph of sourceParagraphs) {
    const foundAt = normalized.indexOf(paragraph, cursor);
    const paragraphStart = foundAt >= 0 ? foundAt : cursor;
    const parts = splitLongParagraph(paragraph);
    let localOffset = 0;

    for (const part of parts) {
      const clean = part.trim();
      if (!clean) {
        localOffset += part.length;
        continue;
      }
      const startChar = paragraphStart + localOffset + part.indexOf(clean);
      const endChar = startChar + clean.length;
      const index = anchors.length + 1;
      anchors.push({
        id: `p-${index}`,
        index,
        text: clean,
        startChar,
        endChar,
        sourceHint: `第 ${index} 段`
      });
      localOffset += part.length;
    }

    cursor = paragraphStart + paragraph.length;
  }

  return anchors;
}

export function buildParagraphAnchorsFromDocument(document: ParsedDocument): ParagraphAnchor[] {
  const structured = ensureDocumentStructure(document);
  const positions = new Map((document.paragraphPositions ?? []).map((position) => [position.paragraphId, position]));
  const outlineNodes = flattenOutline(getEffectiveOutline(structured));
  return structured.paragraphs.map((paragraph) => {
    const section = structured.sections.find((item) => paragraph.index >= paragraphIndex(item.startParagraphId) && paragraph.index <= paragraphIndex(item.endParagraphId ?? item.startParagraphId));
    const outline = outlineNodes.find((item) => {
      if (!item.startParagraphId) return false;
      return paragraph.index >= paragraphIndex(item.startParagraphId) && paragraph.index <= paragraphIndex(item.endParagraphId ?? item.startParagraphId);
    });
    const position = positions.get(paragraph.id);
    return {
      id: paragraph.id.replace(/^para-/, "p-"),
      paragraphId: paragraph.id,
      index: paragraph.index,
      text: paragraph.text,
      startChar: paragraph.startChar,
      endChar: paragraph.endChar,
      sourceHint: paragraph.sourceHint,
      pageNumber: paragraph.pageNumber,
      sectionId: section?.id,
      sectionTitle: section?.title,
      outlineNodeId: outline?.id,
      outlineTitle: outline?.title,
      outlineType: outline?.type,
      qualityFlags: paragraph.quality?.reasons,
      isLowValue: paragraph.quality?.isLowValue,
      coordinateAvailable: Boolean(position?.boundingBox),
      boundingBox: position?.boundingBox,
      coordinateConfidence: position?.confidence
    };
  });
}

function paragraphIndex(id: string) {
  const match = id.match(/(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function splitLongParagraph(paragraph: string) {
  if (paragraph.length <= MAX_ANCHOR_CHARS) return [paragraph];

  const parts: string[] = [];
  let start = 0;
  while (start < paragraph.length) {
    const targetEnd = Math.min(start + TARGET_SPLIT_CHARS, paragraph.length);
    let end = Math.min(start + MAX_ANCHOR_CHARS, paragraph.length);
    if (end < paragraph.length) {
      const windowText = paragraph.slice(start + Math.floor(TARGET_SPLIT_CHARS * 0.6), end);
      const sentenceBreak = Math.max(windowText.lastIndexOf("。"), windowText.lastIndexOf("."), windowText.lastIndexOf("!"), windowText.lastIndexOf("?"));
      if (sentenceBreak >= 0) {
        end = start + Math.floor(TARGET_SPLIT_CHARS * 0.6) + sentenceBreak + 1;
      } else {
        end = targetEnd;
      }
    }
    parts.push(paragraph.slice(start, end));
    start = end;
  }
  return parts;
}
