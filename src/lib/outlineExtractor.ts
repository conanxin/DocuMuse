import type { DocumentOutlineNode, OutlineDiagnostics, ParsedPage, ParsedParagraph, ParseDiagnostics } from "./documentTypes";

export type OutlineExtractionResult = {
  outline: DocumentOutlineNode[];
  outlineDiagnostics: OutlineDiagnostics;
};

type HeadingCandidate = {
  paragraph: ParsedParagraph;
  title: string;
  level: number;
  confidence: DocumentOutlineNode["confidence"];
  type: NonNullable<DocumentOutlineNode["type"]>;
  startChar?: number;
  endChar?: number;
};

export function extractDocumentOutline(
  paragraphs: ParsedParagraph[] = [],
  pages: ParsedPage[] = [],
  diagnostics?: ParseDiagnostics
): OutlineExtractionResult {
  const warnings: string[] = [];
  const candidates = paragraphs
    .filter((paragraph) => !paragraph.quality?.isLowValue)
    .flatMap((paragraph) => detectHeadingCandidates(paragraph, pages));

  if (!candidates.length) {
    warnings.push("No reliable outline headings were detected.");
  }

  const flatOutline = candidates.map((candidate, index) => {
    const node: DocumentOutlineNode = {
      id: `outline-${index + 1}`,
      title: candidate.title,
      level: candidate.level,
      index: index + 1,
      pageNumber: candidate.paragraph.pageNumber,
      startParagraphId: candidate.paragraph.id,
      startChar: candidate.startChar ?? candidate.paragraph.startChar,
      endChar: candidate.endChar,
      confidence: candidate.confidence,
      type: candidate.type
    };
    return node;
  });

  assignParents(flatOutline);
  assignRanges(flatOutline, paragraphs);

  const maxDepth = flatOutline.reduce((max, node) => Math.max(max, node.level), 0);
  const outlineDiagnostics: OutlineDiagnostics = {
    extractor: "heuristic-outline-v1",
    extractedAt: new Date().toISOString(),
    outlineNodeCount: flatOutline.length,
    maxDepth,
    detectedAbstract: flatOutline.some((node) => node.type === "abstract"),
    detectedIntroduction: flatOutline.some((node) => node.type === "introduction"),
    detectedConclusion: flatOutline.some((node) => node.type === "conclusion"),
    detectedReferences: flatOutline.some((node) => node.type === "references"),
    warnings: [
      ...warnings,
      ...(diagnostics?.suspectedScannedPdf ? ["PDF may have too little selectable text; outline detection can be incomplete."] : [])
    ]
  };

  return {
    outline: nestOutline(flatOutline),
    outlineDiagnostics
  };
}

export function flattenOutline(nodes: DocumentOutlineNode[] = []): DocumentOutlineNode[] {
  const flattened: DocumentOutlineNode[] = [];
  for (const node of nodes) {
    const { children, ...rest } = node;
    flattened.push({ ...rest, children });
    if (children?.length) {
      flattened.push(...flattenOutline(children));
    }
  }
  return flattened;
}

function detectHeadingCandidates(paragraph: ParsedParagraph, pages: ParsedPage[]): HeadingCandidate[] {
  const direct = detectHeading(paragraph, pages);
  if (direct) return [direct];
  return detectInlineHeadings(paragraph);
}

function detectHeading(paragraph: ParsedParagraph, pages: ParsedPage[]): HeadingCandidate | null {
  const text = normalizeHeading(paragraph.text);
  if (!text || text.length > 120) return null;
  if (paragraph.quality?.isPageNumberOnly || paragraph.quality?.isRepeatedHeaderFooter) return null;

  const lower = text.toLowerCase();
  const keyword = keywordHeading(lower);
  if (keyword) {
    return { paragraph, title: text, level: 1, confidence: "high", type: keyword };
  }

  const numbered = numberedHeading(text);
  if (numbered) {
    return { paragraph, title: text, level: numbered.level, confidence: "high", type: numbered.level === 1 ? "section" : "subsection" };
  }

  const chinese = chineseHeading(text);
  if (chinese) {
    return { paragraph, title: text, level: chinese.level, confidence: "high", type: chinese.level === 1 ? "section" : "subsection" };
  }

  if (isShortHeadingCandidate(text, paragraph, pages)) {
    return { paragraph, title: text, level: 1, confidence: "medium", type: "unknown" };
  }

  if (/^[A-Z][A-Z0-9\s,&:()-]{4,80}$/.test(text) && /[A-Z]/.test(text)) {
    return { paragraph, title: titleCaseAllCaps(text), level: 1, confidence: "medium", type: "unknown" };
  }

  return null;
}

function detectInlineHeadings(paragraph: ParsedParagraph): HeadingCandidate[] {
  const text = paragraph.text.replace(/\s+/g, " ").trim();
  if (!text || text.length < 20) return [];
  const candidates: HeadingCandidate[] = [];
  const seen = new Set<string>();

  const add = (title: string, offset: number, level: number, type: HeadingCandidate["type"], confidence: HeadingCandidate["confidence"]) => {
    const cleanTitle = normalizeHeading(title).replace(/[.:：;；]+$/, "");
    if (!cleanTitle || cleanTitle.length > 80) return;
    const key = `${cleanTitle}:${offset}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      paragraph,
      title: cleanTitle,
      level,
      confidence,
      type,
      startChar: paragraph.startChar + Math.max(0, offset),
      endChar: paragraph.startChar + Math.max(0, offset) + cleanTitle.length
    });
  };

  const keywordPattern = /\b(Abstract|Introduction|Conclusion|Conclusions|References|Bibliography|Appendix|Appendices)\b(?=\s|$)|(\u6458\u8981|\u5f15\u8a00|\u7ed3\u8bba|\u603b\u7ed3|\u53c2\u8003\u6587\u732e|\u9644\u5f55)(?=\s|$)/g;
  for (const match of Array.from(text.matchAll(keywordPattern))) {
    const title = match[0];
    const before = text.slice(Math.max(0, (match.index ?? 0) - 4), match.index ?? 0);
    if (/\d\.?\s*$/.test(before)) continue;
    add(title, match.index ?? 0, 1, keywordHeading(title.toLowerCase()) ?? "section", "medium");
  }

  const numberedPattern = /(?:^|\s)(\d+(?:\.\d+){0,3})[.)]?\s+([A-Z][A-Za-z0-9,&:()/-]{1,40})(?=\s+[A-Z\u4e00-\u9fff]|\s*$)/g;
  for (const match of Array.from(text.matchAll(numberedPattern))) {
    const prefix = match[1];
    const title = `${prefix} ${match[2]}`;
    const parts = prefix.split(".").filter(Boolean);
    add(title, (match.index ?? 0) + match[0].indexOf(prefix), Math.min(3, Math.max(1, parts.length)), parts.length === 1 ? "section" : "subsection", "medium");
  }

  const chineseNumberedPattern = /(?:^|\s)([\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]+[、.．]\s*.{1,30}?)(?=\s|$)/g;
  for (const match of Array.from(text.matchAll(chineseNumberedPattern))) {
    add(match[1], (match.index ?? 0) + match[0].indexOf(match[1]), 1, "section", "medium");
  }

  return candidates.sort((a, b) => (a.startChar ?? 0) - (b.startChar ?? 0));
}

function keywordHeading(lower: string): HeadingCandidate["type"] | null {
  if (/^(abstract|\u6458\u8981)$/.test(lower)) return "abstract";
  if (/^(introduction|intro|\u5f15\u8a00|\u7eea\u8bba|\u524d\u8a00)$/.test(lower)) return "introduction";
  if (/^(conclusion|conclusions|\u7ed3\u8bba|\u603b\u7ed3)$/.test(lower)) return "conclusion";
  if (/^(references|bibliography|\u53c2\u8003\u6587\u732e)$/.test(lower)) return "references";
  if (/^(appendix|appendices|\u9644\u5f55)$/.test(lower)) return "appendix";
  if (/^(abstract|摘要)$/.test(lower)) return "abstract";
  if (/^(introduction|intro|引言|绪论|前言)$/.test(lower)) return "introduction";
  if (/^(conclusion|conclusions|结论|总结)$/.test(lower)) return "conclusion";
  if (/^(references|bibliography|参考文献)$/.test(lower)) return "references";
  if (/^(appendix|appendices|附录)$/.test(lower)) return "appendix";
  return null;
}

function numberedHeading(text: string) {
  const match = text.match(/^(\d+(?:\.\d+){0,3})(?:[.)、\s]+)(.{0,100})$/);
  if (!match) return null;
  const parts = match[1].split(".").filter(Boolean);
  return { level: Math.min(3, Math.max(1, parts.length)) };
}

function chineseHeading(text: string) {
  if (/^第\s*[一二三四五六七八九十百\d]+\s*章/.test(text)) return { level: 1 };
  if (/^第\s*[一二三四五六七八九十百\d]+\s*节/.test(text)) return { level: 2 };
  if (/^[一二三四五六七八九十]+、/.test(text)) return { level: 1 };
  if (/^（[一二三四五六七八九十\d]+）/.test(text)) return { level: 2 };
  return null;
}

function isShortHeadingCandidate(text: string, paragraph: ParsedParagraph, pages: ParsedPage[]) {
  if (text.length < 4 || text.length > 48) return false;
  if (/[。！？!?；;]$/.test(text)) return false;
  if (!/[\u4e00-\u9fffa-z]/i.test(text)) return false;
  const page = pages.find((item) => item.pageNumber === paragraph.pageNumber);
  const nearPageStart = page ? paragraph.startChar <= page.startChar + 400 : paragraph.index <= 3;
  return nearPageStart || paragraph.text.length <= 36;
}

function assignParents(nodes: DocumentOutlineNode[]) {
  const stack: DocumentOutlineNode[] = [];
  for (const node of nodes) {
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    node.parentId = stack[stack.length - 1]?.id;
    stack.push(node);
  }
}

function assignRanges(nodes: DocumentOutlineNode[], paragraphs: ParsedParagraph[]) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const startIndex = paragraphIndex(node.startParagraphId);
    const nextBoundary = nodes.slice(index + 1).find((candidate) => candidate.level <= node.level);
    const endIndex = nextBoundary ? Math.max(startIndex, paragraphIndex(nextBoundary.startParagraphId) - 1) : paragraphs[paragraphs.length - 1]?.index;
    const endParagraph = paragraphs.find((paragraph) => paragraph.index === endIndex) ?? paragraphs[paragraphs.length - 1];
    node.endParagraphId = endParagraph?.id;
    node.endChar = nextBoundary?.startChar && nextBoundary.startChar > (node.startChar ?? 0) ? nextBoundary.startChar - 1 : endParagraph?.endChar;
  }
}

function nestOutline(nodes: DocumentOutlineNode[]) {
  const byId = new Map<string, DocumentOutlineNode>();
  const roots: DocumentOutlineNode[] = [];

  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] });
  }

  for (const node of Array.from(byId.values())) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)?.children?.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function paragraphIndex(id?: string) {
  const match = id?.match(/(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function normalizeHeading(text: string) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[#>*\-\s]+/, "")
    .trim();
}

function titleCaseAllCaps(text: string) {
  return text
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}
