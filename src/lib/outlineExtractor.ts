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
};

export function extractDocumentOutline(
  paragraphs: ParsedParagraph[] = [],
  pages: ParsedPage[] = [],
  diagnostics?: ParseDiagnostics
): OutlineExtractionResult {
  const warnings: string[] = [];
  const candidates = paragraphs
    .filter((paragraph) => !paragraph.quality?.isLowValue)
    .map((paragraph) => detectHeading(paragraph, pages))
    .filter((candidate): candidate is HeadingCandidate => Boolean(candidate));

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
      startChar: candidate.paragraph.startChar,
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

function keywordHeading(lower: string): HeadingCandidate["type"] | null {
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
    node.endChar = endParagraph?.endChar;
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
