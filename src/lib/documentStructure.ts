import type { ParsedDocument, ParsedPage, ParsedParagraph, ParsedSection, ParseDiagnostics, PdfParagraphPosition, PdfTextItemBox } from "./documentTypes";
import { extractDocumentOutline } from "./outlineExtractor";

export type DocumentStructure = {
  text: string;
  pageCount: number;
  pages: ParsedPage[];
  paragraphs: ParsedParagraph[];
  sections: ParsedSection[];
  parseDiagnostics: ParseDiagnostics;
};

const MAX_PARAGRAPH_CHARS = 1800;
const TARGET_PARAGRAPH_CHARS = 1300;

export function buildDocumentStructure(text: string, pageCount = 0, parser = "text-heuristic"): DocumentStructure {
  const normalized = normalizeDocumentText(text);
  const pages = buildPages(normalized, pageCount);
  let paragraphs = buildParagraphs(normalized, pages);
  const sections = buildSections(paragraphs);
  let diagnostics = buildDiagnostics({
    parser,
    text: normalized,
    pages,
    paragraphs,
    sections,
    pageCount
  });
  paragraphs = annotateParagraphQuality(paragraphs, diagnostics);
  diagnostics = {
    ...diagnostics,
    lowValueParagraphCount: paragraphs.filter((paragraph) => paragraph.quality?.isLowValue).length,
    repeatedHeaderFooterParagraphCount: paragraphs.filter((paragraph) => paragraph.quality?.isRepeatedHeaderFooter).length,
    pageNumberParagraphCount: paragraphs.filter((paragraph) => paragraph.quality?.isPageNumberOnly).length
  };

  return {
    text: normalized,
    pageCount: diagnostics.pageCount ?? pageCount ?? pages.length,
    pages,
    paragraphs,
    sections,
    parseDiagnostics: diagnostics
  };
}

export function annotateParagraphQuality(paragraphs: ParsedParagraph[], diagnostics?: ParseDiagnostics): ParsedParagraph[] {
  const repeatedLines = new Set([...(diagnostics?.suspectedHeaderFooterLines ?? []), ...(diagnostics?.repeatedLineCandidates ?? [])].map(normalizeDiagnosticLine));
  const referenceStartIndex = findReferenceStartIndex(paragraphs);
  const shortTextCounts = new Map<string, number>();

  for (const paragraph of paragraphs) {
    const key = normalizeDiagnosticLine(paragraph.text);
    if (key.length > 0 && key.length <= 80) {
      shortTextCounts.set(key, (shortTextCounts.get(key) ?? 0) + 1);
    }
  }

  return paragraphs.map((paragraph) => {
    const text = paragraph.text.trim();
    const normalized = normalizeDiagnosticLine(text);
    const reasons: string[] = [];
    const isPageNumberOnly = isPageNumberParagraph(normalized);
    const isVeryShort = normalized.length < 8 || isSymbolOnly(normalized) || isShortCopyrightMark(normalized);
    const isRepeatedHeaderFooter = repeatedLines.has(normalized) || (normalized.length <= 80 && (shortTextCounts.get(normalized) ?? 0) >= 2 && paragraphs.length > 4);
    const isLikelyFootnote = /^(\d{1,3}[\).、]\s+|\*\s+).{6,160}$/.test(normalized);
    const isLikelyReference = referenceStartIndex >= 0 && paragraph.index >= referenceStartIndex;

    if (isRepeatedHeaderFooter) reasons.push("repeated_header_footer");
    if (isPageNumberOnly) reasons.push("page_number");
    if (isVeryShort) reasons.push("very_short_or_symbol_only");
    if (isLikelyFootnote) reasons.push("likely_footnote");
    if (isLikelyReference) reasons.push("likely_reference");

    const isLowValue = isRepeatedHeaderFooter || isPageNumberOnly || isVeryShort;
    return {
      ...paragraph,
      quality: {
        isRepeatedHeaderFooter,
        isPageNumberOnly,
        isVeryShort,
        isLikelyFootnote,
        isLikelyReference,
        isLowValue,
        reasons
      }
    };
  });
}

export function mapParagraphsToPdfCoordinates(paragraphs: ParsedParagraph[], textItems: PdfTextItemBox[]): PdfParagraphPosition[] {
  if (!paragraphs.length || !textItems.length) return [];
  const itemsByPage = new Map<number, PdfTextItemBox[]>();
  for (const item of textItems) {
    const items = itemsByPage.get(item.pageNumber) ?? [];
    items.push(item);
    itemsByPage.set(item.pageNumber, items);
  }

  return paragraphs.map((paragraph) => {
    const pageItems = itemsByPage.get(paragraph.pageNumber ?? 0) ?? textItems;
    const matchedBoxes = matchParagraphItems(paragraph.text, pageItems);
    const boxes = matchedBoxes.length ? matchedBoxes : approximateParagraphItems(paragraph, pageItems);
    const confidence = matchedBoxes.length >= 2 ? "high" : matchedBoxes.length === 1 ? "medium" : boxes.length ? "low" : "low";
    return {
      paragraphId: paragraph.id,
      pageNumber: paragraph.pageNumber ?? boxes[0]?.pageNumber ?? 1,
      boxes,
      boundingBox: boxes.length ? boundingBox(boxes) : undefined,
      confidence,
      reason: matchedBoxes.length ? "matched_text_items" : boxes.length ? "approximate_page_or_overlap_match" : "no_coordinate_match"
    };
  });
}

export function ensureDocumentStructure(document: ParsedDocument): ParsedDocument & Required<Pick<ParsedDocument, "pages" | "paragraphs" | "sections" | "parseDiagnostics">> {
  if (document.paragraphs?.length && document.pages?.length && document.parseDiagnostics && document.outline && document.outlineDiagnostics) {
    return document as ParsedDocument & Required<Pick<ParsedDocument, "pages" | "paragraphs" | "sections" | "parseDiagnostics">>;
  }

  const structure = buildDocumentStructure(document.text ?? "", document.pageCount ?? 0, "runtime-fallback");
  const pages = document.pages?.length ? document.pages : structure.pages;
  const paragraphs = document.paragraphs?.length ? document.paragraphs : structure.paragraphs;
  const sections = document.sections?.length ? document.sections : structure.sections;
  const parseDiagnostics = document.parseDiagnostics ?? structure.parseDiagnostics;
  const outlineResult = document.outline && document.outlineDiagnostics ? null : extractDocumentOutline(paragraphs, pages, parseDiagnostics);
  return {
    ...document,
    pageCount: document.pageCount || structure.pageCount,
    pages,
    paragraphs,
    sections,
    outline: document.outline ?? outlineResult?.outline,
    outlineDiagnostics: document.outlineDiagnostics ?? outlineResult?.outlineDiagnostics,
    parseDiagnostics
  };
}

function normalizeDocumentText(text: string) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function buildPages(text: string, pageCount: number): ParsedPage[] {
  if (!text) return [];

  const explicitPages = text.includes("\f") ? text.split(/\f+/) : null;
  if (explicitPages && explicitPages.length > 1) {
    return explicitPages.map((pageText, index) => pageFromSlice(text, pageText.trim(), index + 1));
  }

  const count = Math.max(1, pageCount || 1);
  if (count === 1) {
    return [{ pageNumber: 1, text, startChar: 0, endChar: text.length, paragraphIds: [] }];
  }

  const pages: ParsedPage[] = [];
  const average = Math.ceil(text.length / count);
  let start = 0;
  for (let index = 0; index < count; index += 1) {
    const isLast = index === count - 1;
    let end = isLast ? text.length : Math.min(text.length, start + average);
    if (!isLast) {
      const windowText = text.slice(Math.max(start, end - 500), Math.min(text.length, end + 500));
      const breakAt = Math.max(windowText.lastIndexOf("\n\n"), windowText.lastIndexOf("\n"));
      if (breakAt > 0) {
        end = Math.max(start + 1, Math.max(start, end - 500) + breakAt);
      }
    }
    pages.push({
      pageNumber: index + 1,
      text: text.slice(start, end).trim(),
      startChar: start,
      endChar: end,
      paragraphIds: []
    });
    start = end;
  }
  return pages.filter((page) => page.text.length > 0);
}

function pageFromSlice(fullText: string, pageText: string, pageNumber: number): ParsedPage {
  const startChar = fullText.indexOf(pageText);
  const safeStart = startChar >= 0 ? startChar : 0;
  return {
    pageNumber,
    text: pageText,
    startChar: safeStart,
    endChar: safeStart + pageText.length,
    paragraphIds: []
  };
}

function buildParagraphs(text: string, pages: ParsedPage[]): ParsedParagraph[] {
  const paragraphs: ParsedParagraph[] = [];
  let cursor = 0;

  for (const page of pages) {
    const roughParagraphs = splitPageParagraphs(page.text);
    let pageCursor = page.startChar;

    for (const rawParagraph of roughParagraphs) {
      const clean = cleanParagraph(rawParagraph);
      if (clean.length < 8) continue;

      const rawStart = text.indexOf(rawParagraph.trim(), Math.max(cursor, pageCursor));
      const startBase = rawStart >= 0 ? rawStart : pageCursor;
      for (const part of splitLongParagraph(clean)) {
        const partStart = text.indexOf(part.slice(0, Math.min(part.length, 80)), startBase);
        const startChar = partStart >= 0 ? partStart : startBase;
        const endChar = Math.min(text.length, startChar + part.length);
        const index = paragraphs.length + 1;
        const paragraph: ParsedParagraph = {
          id: `para-${index}`,
          index,
          pageNumber: page.pageNumber,
          text: part,
          startChar,
          endChar,
          sourceHint: `第 ${page.pageNumber} 页 · 第 ${index} 段`
        };
        paragraphs.push(paragraph);
        page.paragraphIds.push(paragraph.id);
      }
      cursor = startBase + rawParagraph.length;
      pageCursor = cursor;
    }
  }

  if (!paragraphs.length && text.trim()) {
    paragraphs.push({
      id: "para-1",
      index: 1,
      pageNumber: pages[0]?.pageNumber ?? 1,
      text: text.trim(),
      startChar: 0,
      endChar: text.trim().length,
      sourceHint: "第 1 页 · 第 1 段"
    });
    if (pages[0]) pages[0].paragraphIds.push("para-1");
  }

  return paragraphs;
}

function splitPageParagraphs(pageText: string) {
  const blocks = pageText
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (blocks.length > 1) return blocks;

  const lines = pageText
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const groups: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const startsNew = looksLikeHeading(line) || current.join(" ").length > TARGET_PARAGRAPH_CHARS;
    if (startsNew && current.length) {
      groups.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }
  if (current.length) groups.push(current.join("\n"));
  return groups;
}

function cleanParagraph(paragraph: string) {
  return paragraph
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitLongParagraph(paragraph: string) {
  if (paragraph.length <= MAX_PARAGRAPH_CHARS) return [paragraph];

  const parts: string[] = [];
  let start = 0;
  while (start < paragraph.length) {
    let end = Math.min(start + TARGET_PARAGRAPH_CHARS, paragraph.length);
    if (end < paragraph.length) {
      const windowText = paragraph.slice(start + Math.floor(TARGET_PARAGRAPH_CHARS * 0.55), Math.min(start + MAX_PARAGRAPH_CHARS, paragraph.length));
      const sentenceBreak = Math.max(windowText.lastIndexOf("。"), windowText.lastIndexOf("."), windowText.lastIndexOf("!"), windowText.lastIndexOf("?"));
      if (sentenceBreak >= 0) {
        end = start + Math.floor(TARGET_PARAGRAPH_CHARS * 0.55) + sentenceBreak + 1;
      }
    }
    parts.push(paragraph.slice(start, end).trim());
    start = end;
  }
  return parts.filter(Boolean);
}

function buildSections(paragraphs: ParsedParagraph[]): ParsedSection[] {
  const sections: ParsedSection[] = [];

  paragraphs.forEach((paragraph) => {
    if (!looksLikeHeading(paragraph.text)) return;
    const index = sections.length + 1;
    sections.push({
      id: `section-${index}`,
      index,
      title: paragraph.text.slice(0, 80),
      level: inferSectionLevel(paragraph.text),
      startParagraphId: paragraph.id,
      startChar: paragraph.startChar,
      pageNumber: paragraph.pageNumber
    });
  });

  sections.forEach((section, index) => {
    const next = sections[index + 1];
    const endParagraph = next
      ? paragraphs.find((paragraph) => paragraph.index === Math.max(1, paragraphIndex(next.startParagraphId) - 1))
      : paragraphs[paragraphs.length - 1];
    section.endParagraphId = endParagraph?.id;
    section.endChar = endParagraph?.endChar ?? section.startChar;
  });

  return sections;
}

function looksLikeHeading(text: string) {
  const clean = text.trim();
  if (!clean || clean.length > 90) return false;
  if (/^(摘要|引言|绪论|前言|结论|参考文献|目录)$/.test(clean)) return true;
  if (/^(第\s*[一二三四五六七八九十\d]+\s*(章|节|部分)|[一二三四五六七八九十]+、|\d+(\.\d+)*\s+)/.test(clean)) return true;
  if (/^(abstract|introduction|conclusion|references|discussion|methodology|results)$/i.test(clean)) return true;
  return clean.length <= 36 && !/[。！？.!?]$/.test(clean) && /[\u4e00-\u9fffa-z]/i.test(clean);
}

function inferSectionLevel(text: string) {
  if (/^\d+\.\d+/.test(text)) return 2;
  return 1;
}

function paragraphIndex(id: string) {
  const match = id.match(/(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function buildDiagnostics({
  parser,
  text,
  pages,
  paragraphs,
  sections,
  pageCount
}: {
  parser: string;
  text: string;
  pages: ParsedPage[];
  paragraphs: ParsedParagraph[];
  sections: ParsedSection[];
  pageCount: number;
}): ParseDiagnostics {
  const warnings: string[] = [];
  const resolvedPageCount = pageCount || pages.length;
  const emptyPageCount = Math.max(0, resolvedPageCount - pages.filter((page) => page.text.trim().length > 0).length);
  const averageCharsPerPage = resolvedPageCount ? Math.round(text.length / resolvedPageCount) : undefined;
  const hasVeryShortText = text.trim().length < 30;
  const pageDiagnostics = buildPageDiagnostics(pages, paragraphs);
  const repeatedLineCandidates = detectRepeatedBoundaryLines(pages);
  const suspectedHeaderFooterLines = repeatedLineCandidates.slice(0, 12);
  const headingCandidateCount = paragraphs.filter((paragraph) => looksLikeHeading(paragraph.text)).length;
  const suspectedReferenceSection = /\b(references|bibliography)\b/i.test(text) || /参考文献/.test(text);
  const suspectedFootnoteCount = countFootnoteCandidates(text);
  const languageGuess = guessDocumentLanguage(text);
  const lowDensityPageCount = pageDiagnostics.filter((page) => page.lowTextDensity).length;
  const suspectedScannedPdf =
    hasVeryShortText ||
    (resolvedPageCount > 1 && (averageCharsPerPage ?? 0) < 80) ||
    (resolvedPageCount > 0 && emptyPageCount / resolvedPageCount > 0.45) ||
    (resolvedPageCount >= 3 && paragraphs.length <= Math.max(2, resolvedPageCount / 2));

  if (suspectedScannedPdf) warnings.push("疑似扫描版 PDF：当前版本暂不支持 OCR。");
  if (hasVeryShortText || (averageCharsPerPage ?? 0) < 120) warnings.push("文本层较少，解析结果可能不完整。");
  if (emptyPageCount > 0) warnings.push("部分页面没有提取到可复制文本。");
  if (repeatedLineCandidates.length) warnings.push("检测到可能的重复页眉/页脚，可能影响段落切分。");
  if (headingCandidateCount > sections.length + 4) warnings.push("检测到多个疑似标题，但章节识别较少，可后续优化标题规则。");
  if (!sections.length) warnings.push("No clear section headings were detected.");

  const qualityScore = computeQualityScore({
    textLength: text.length,
    resolvedPageCount,
    averageCharsPerPage,
    emptyPageCount,
    paragraphCount: paragraphs.length,
    repeatedLineCount: repeatedLineCandidates.length,
    suspectedScannedPdf,
    lowDensityPageCount
  });
  const qualityLabel = qualityLabelForScore(qualityScore, text.length);

  return {
    parser,
    parsedAt: new Date().toISOString(),
    pageCount: resolvedPageCount,
    textLength: text.length,
    paragraphCount: paragraphs.length,
    sectionCount: sections.length,
    averageCharsPerPage,
    emptyPageCount,
    suspectedScannedPdf,
    hasVeryShortText,
    warnings,
    qualityScore,
    qualityLabel,
    pageDiagnostics,
    repeatedLineCandidates,
    suspectedHeaderFooterLines,
    suspectedReferenceSection,
    suspectedFootnoteCount,
    headingCandidateCount,
    languageGuess
  };
}

function buildPageDiagnostics(pages: ParsedPage[], paragraphs: ParsedParagraph[]) {
  const paragraphCountByPage = new Map<number, number>();
  for (const paragraph of paragraphs) {
    if (paragraph.pageNumber) {
      paragraphCountByPage.set(paragraph.pageNumber, (paragraphCountByPage.get(paragraph.pageNumber) ?? 0) + 1);
    }
  }
  const repeated = detectRepeatedBoundaryLines(pages);
  return pages.map((page) => {
    const pageRepeated = boundaryLines(page.text).filter((line) => repeated.includes(line));
    const textLength = page.text.trim().length;
    return {
      pageNumber: page.pageNumber,
      textLength,
      paragraphCount: paragraphCountByPage.get(page.pageNumber) ?? page.paragraphIds.length,
      empty: textLength === 0,
      lowTextDensity: textLength > 0 && textLength < 120,
      repeatedHeaderFooterCandidates: pageRepeated
    };
  });
}

function detectRepeatedBoundaryLines(pages: ParsedPage[]) {
  if (pages.length < 2) return [];
  const counts = new Map<string, number>();
  for (const page of pages) {
    for (const line of Array.from(new Set(boundaryLines(page.text)))) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }
  const threshold = Math.max(2, Math.ceil(pages.length * 0.4));
  return Array.from(counts.entries())
    .filter(([line, count]) => count >= threshold && line.length <= 90)
    .sort((a, b) => b[1] - a[1])
    .map(([line]) => line)
    .slice(0, 20);
}

function boundaryLines(text: string) {
  const lines = text
    .split(/\n/)
    .map((line) => normalizeDiagnosticLine(line))
    .filter((line) => line.length >= 2 && line.length <= 120);
  return [...lines.slice(0, 3), ...lines.slice(-3)];
}

function normalizeDiagnosticLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function countFootnoteCandidates(text: string) {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => /^(\d{1,3}[\).、]\s+|\*\s+).{6,160}$/.test(line))
    .length;
}

function findReferenceStartIndex(paragraphs: ParsedParagraph[]) {
  const found = paragraphs.find((paragraph) => /\b(references|bibliography)\b/i.test(paragraph.text.trim()) || /参考文献/.test(paragraph.text));
  return found?.index ?? -1;
}

function isPageNumberParagraph(text: string) {
  return /^(\d{1,4}|-\s*\d{1,4}\s*-|page\s+\d{1,4}|第\s*\d{1,4}\s*页)$/i.test(text.trim());
}

function isSymbolOnly(text: string) {
  return /^[\W_]+$/.test(text.replace(/\s+/g, ""));
}

function isShortCopyrightMark(text: string) {
  return /^(copyright|all rights reserved|©)/i.test(text) && text.length < 80;
}

function matchParagraphItems(paragraphText: string, items: PdfTextItemBox[]) {
  const target = coordinateMatchText(paragraphText);
  if (!target || !items.length) return [];
  const itemTexts = items.map((item) => coordinateMatchText(item.text));
  const joined = itemTexts.join("");
  const targetSlice = target.slice(0, Math.min(target.length, 500));
  const foundAt = joined.indexOf(targetSlice.length >= 20 ? targetSlice : target);
  if (foundAt < 0) {
    return tokenOverlapItems(target, items);
  }

  const selected: PdfTextItemBox[] = [];
  let cursor = 0;
  const endAt = foundAt + targetSlice.length;
  for (let index = 0; index < items.length; index += 1) {
    const itemStart = cursor;
    const itemEnd = cursor + itemTexts[index].length;
    if (itemEnd >= foundAt && itemStart <= endAt) {
      selected.push(items[index]);
    }
    cursor = itemEnd;
  }
  return selected.slice(0, 80);
}

function tokenOverlapItems(target: string, items: PdfTextItemBox[]) {
  const tokens = Array.from(new Set(target.match(/[\u4e00-\u9fff]{2,}|[a-z0-9]{3,}/gi)?.map((token) => token.toLowerCase()).slice(0, 24) ?? []));
  if (!tokens.length) return [];
  return items
    .filter((item) => {
      const text = item.text.toLowerCase();
      for (const token of tokens) {
        if (text.includes(token)) return true;
      }
      return false;
    })
    .slice(0, 40);
}

function approximateParagraphItems(paragraph: ParsedParagraph, items: PdfTextItemBox[]) {
  if (!items.length) return [];
  const pageItems = paragraph.pageNumber ? items.filter((item) => item.pageNumber === paragraph.pageNumber) : items;
  return pageItems.slice(0, Math.min(8, pageItems.length));
}

function coordinateMatchText(text: string) {
  return text.replace(/\s+/g, "").toLowerCase();
}

function boundingBox(boxes: PdfTextItemBox[]) {
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  return {
    x: roundCoordinate(minX),
    y: roundCoordinate(minY),
    width: roundCoordinate(maxX - minX),
    height: roundCoordinate(maxY - minY)
  };
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(2));
}

export function guessDocumentLanguage(text: string): "zh" | "en" | "mixed" | "unknown" {
  const sample = text.slice(0, 20000);
  const zhCount = (sample.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const enCount = (sample.match(/[A-Za-z]{2,}/g) ?? []).join("").length;
  const total = zhCount + enCount;
  if (total < 20) return "unknown";
  const zhRatio = zhCount / total;
  const enRatio = enCount / total;
  if (zhRatio > 0.55 && enRatio > 0.15) return "mixed";
  if (enRatio > 0.55 && zhRatio > 0.15) return "mixed";
  if (zhRatio >= 0.35 && enRatio >= 0.25) return "mixed";
  if (zhRatio > enRatio) return "zh";
  return "en";
}

function computeQualityScore({
  textLength,
  resolvedPageCount,
  averageCharsPerPage,
  emptyPageCount,
  paragraphCount,
  repeatedLineCount,
  suspectedScannedPdf,
  lowDensityPageCount
}: {
  textLength: number;
  resolvedPageCount: number;
  averageCharsPerPage?: number;
  emptyPageCount: number;
  paragraphCount: number;
  repeatedLineCount: number;
  suspectedScannedPdf: boolean;
  lowDensityPageCount: number;
}) {
  if (!textLength && !resolvedPageCount) return undefined;
  let score = 100;
  if (textLength < 30) score -= 70;
  else if (textLength < 100) score -= 45;
  else if (textLength < 500) score -= 15;

  if ((averageCharsPerPage ?? 0) < 60 && resolvedPageCount > 1) score -= 35;
  else if ((averageCharsPerPage ?? 0) < 160 && resolvedPageCount > 1) score -= 15;

  if (resolvedPageCount > 0) {
    score -= Math.min(30, Math.round((emptyPageCount / resolvedPageCount) * 45));
    score -= Math.min(18, Math.round((lowDensityPageCount / resolvedPageCount) * 24));
  }
  if (textLength > 3000 && paragraphCount < 3) score -= 18;
  if (repeatedLineCount > 8) score -= 8;
  if (repeatedLineCount > 16) score -= 8;
  if (suspectedScannedPdf) score = Math.min(score, 45);
  return Math.max(0, Math.min(100, score));
}

function qualityLabelForScore(score: number | undefined, textLength: number): ParseDiagnostics["qualityLabel"] {
  if (typeof score !== "number" || !textLength) return "unknown";
  if (score >= 80) return "good";
  if (score >= 50) return "fair";
  return "poor";
}
