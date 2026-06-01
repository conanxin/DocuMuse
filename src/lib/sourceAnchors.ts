export type ParagraphAnchor = {
  id: string;
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  sourceHint: string;
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
