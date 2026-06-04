import type { ParsedDocument, ParsedPage, ParsedParagraph, ParsedSection, ParseDiagnostics } from "./documentTypes";

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
  const paragraphs = buildParagraphs(normalized, pages);
  const sections = buildSections(paragraphs);
  const diagnostics = buildDiagnostics({
    parser,
    text: normalized,
    pages,
    paragraphs,
    sections,
    pageCount
  });

  return {
    text: normalized,
    pageCount: diagnostics.pageCount ?? pageCount ?? pages.length,
    pages,
    paragraphs,
    sections,
    parseDiagnostics: diagnostics
  };
}

export function ensureDocumentStructure(document: ParsedDocument): ParsedDocument & Required<Pick<ParsedDocument, "pages" | "paragraphs" | "sections" | "parseDiagnostics">> {
  if (document.paragraphs?.length && document.pages?.length && document.parseDiagnostics) {
    return document as ParsedDocument & Required<Pick<ParsedDocument, "pages" | "paragraphs" | "sections" | "parseDiagnostics">>;
  }

  const structure = buildDocumentStructure(document.text ?? "", document.pageCount ?? 0, "runtime-fallback");
  return {
    ...document,
    pageCount: document.pageCount || structure.pageCount,
    pages: document.pages?.length ? document.pages : structure.pages,
    paragraphs: document.paragraphs?.length ? document.paragraphs : structure.paragraphs,
    sections: document.sections?.length ? document.sections : structure.sections,
    parseDiagnostics: document.parseDiagnostics ?? structure.parseDiagnostics
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
  const suspectedScannedPdf = hasVeryShortText || (resolvedPageCount > 1 && (averageCharsPerPage ?? 0) < 60);

  if (hasVeryShortText) warnings.push("Extracted text is very short. The PDF may be scanned or image-only.");
  if (emptyPageCount > 0) warnings.push(`${emptyPageCount} page(s) appear empty after text extraction.`);
  if (!sections.length) warnings.push("No clear section headings were detected.");

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
    warnings
  };
}
