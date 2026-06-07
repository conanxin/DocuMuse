import type { DocumentKind, DocumentKindDetection, ParsedDocument } from "./documentTypes";

type DocumentKindInput = Partial<Pick<ParsedDocument, "text" | "paragraphs" | "outline" | "parseDiagnostics" | "outlineDiagnostics" | "documentKind">>;

type ScoredKind = {
  kind: DocumentKind;
  score: number;
  reasons: string[];
};

const KIND_LABELS: Record<DocumentKind, string> = {
  paper: "论文",
  interview: "采访",
  "business-report": "企业报告",
  fiction: "小说",
  manual: "说明书",
  "book-chapter": "书籍章节",
  article: "普通文章",
  unknown: "未知"
};

const CONFIDENCE_LABELS: Record<DocumentKindDetection["confidence"], string> = {
  high: "高",
  medium: "中",
  low: "低"
};

export function detectDocumentKind(documentLike: DocumentKindInput): DocumentKindDetection {
  try {
    const text = normalizeText(documentLike.text ?? documentLike.paragraphs?.map((paragraph) => paragraph.text).join("\n") ?? "");
    const outlineTitles = (documentLike.outline ?? []).map((node) => node.title).join("\n");
    const searchable = normalizeText(`${text.slice(0, 60000)}\n${outlineTitles}`);
    const lower = searchable.toLowerCase();
    const signals = {
      hasAbstract: hasAny(searchable, [/摘要/, /\babstract\b/i]),
      hasReferences: hasAny(searchable, [/参考文献/, /\breferences\b/i, /\bbibliography\b/i]),
      hasInterviewPattern: hasInterviewPattern(searchable),
      hasDialogue: hasDialogue(searchable),
      hasChapters: hasAny(searchable, [/第[一二三四五六七八九十百\d]+\s*[章节]/, /\bchapter\s+\d+/i, /^chapter\b/im]),
      hasBusinessTerms: hasAny(searchable, [/营收|财报|股东|公司治理|风险管理|业务板块|年度报告|季度报告|战略/i, /\bannual report\b/i, /\bquarterly report\b/i, /\besg\b/i, /\brevenue\b/i, /\brisk\b/i, /\bstrategy\b/i]),
      hasProcedureSteps: hasAny(searchable, [/步骤|安装|配置|注意事项|故障排除|常见问题|参数|命令/, /\bstep\s+\d+\b/i, /\bhow to\b/i, /\btroubleshooting\b/i, /\bfaq\b/i, /\bconfiguration\b/i]),
      hasFictionSignals: hasAny(searchable, [/小说|人物|情节|场景|叙事|主人公/, /\bprologue\b/i, /\bepilogue\b/i])
    };

    const scores: ScoredKind[] = [
      scorePaper(searchable, lower, signals),
      scoreInterview(searchable, lower, signals),
      scoreBusinessReport(searchable, lower, signals),
      scoreFiction(searchable, lower, signals),
      scoreManual(searchable, lower, signals),
      scoreBookChapter(searchable, lower, signals),
      scoreArticle(searchable, lower)
    ].sort((a, b) => b.score - a.score);

    const best = scores[0];
    const second = scores[1];
    if (!best || best.score < 2) return unknownDetection(["信息不足，无法稳定判断文档类型。"], signals);

    const gap = best.score - (second?.score ?? 0);
    const confidence: DocumentKindDetection["confidence"] = best.score >= 8 && gap >= 3 ? "high" : best.score >= 5 && gap >= 2 ? "medium" : "low";
    return {
      kind: confidence === "low" && best.score < 4 && best.kind !== "article" ? "unknown" : best.kind,
      confidence,
      reasons: best.reasons.slice(0, 8),
      detectedAt: new Date().toISOString(),
      signals
    };
  } catch {
    return unknownDetection(["文档类型识别失败，已回退为未知类型。"]);
  }
}

export function ensureDocumentKind<T extends ParsedDocument>(document: T): T & { documentKind: DocumentKindDetection } {
  if (document.documentKind?.kind) {
    return document as T & { documentKind: DocumentKindDetection };
  }
  return {
    ...document,
    documentKind: detectDocumentKind(document)
  };
}

export function documentKindLabel(kind?: DocumentKind) {
  return KIND_LABELS[kind ?? "unknown"] ?? KIND_LABELS.unknown;
}

export function documentKindConfidenceLabel(confidence?: DocumentKindDetection["confidence"]) {
  return CONFIDENCE_LABELS[confidence ?? "low"] ?? CONFIDENCE_LABELS.low;
}

export function documentKindPromptHint(kind?: DocumentKind) {
  switch (kind) {
    case "paper":
      return "Document kind hint: academic paper. Pay attention to research question, method, results, conclusion, limitations, and references.";
    case "interview":
      return "Document kind hint: interview. Pay attention to speakers, questions, viewpoints, memorable quotes, and topic shifts.";
    case "business-report":
      return "Document kind hint: business report. Pay attention to metrics, revenue, risks, strategy, business segments, and governance.";
    case "fiction":
      return "Document kind hint: fiction. Pay attention to characters, scenes, plot, theme, conflicts, and narrative voice.";
    case "manual":
      return "Document kind hint: manual. Pay attention to procedures, warnings, configuration, parameters, troubleshooting, and FAQ.";
    case "book-chapter":
      return "Document kind hint: book chapter. Pay attention to concepts, chapter structure, examples, arguments, and key explanations.";
    case "article":
      return "Document kind hint: article. Use a general reading-analysis approach.";
    default:
      return "Document kind hint: unknown. Use a general reading-analysis approach and avoid over-specialized assumptions.";
  }
}

function scorePaper(text: string, lower: string, signals: DocumentKindDetection["signals"]): ScoredKind {
  const reasons: string[] = [];
  let score = 0;
  if (signals?.hasAbstract) add(reasons, "检测到 Abstract / 摘要。", 2);
  if (signals?.hasReferences) add(reasons, "检测到 References / 参考文献。", 2);
  if (/\b(introduction|method|methodology|results|discussion|conclusion)\b/i.test(text)) add(reasons, "检测到论文常见章节词。", 2);
  if (/引言|方法|结果|讨论|结论/.test(text)) add(reasons, "检测到中文论文结构词。", 2);
  if (/\b(doi|arxiv|journal|citation|et al\.)\b/i.test(lower) || /\[[0-9]{1,3}\]/.test(text)) add(reasons, "检测到 DOI / arXiv / citation / 引文格式。", 2);
  return { kind: "paper", score, reasons };
  function add(target: string[], reason: string, value: number) {
    score += value;
    target.push(reason);
  }
}

function scoreInterview(text: string, lower: string, signals: DocumentKindDetection["signals"]): ScoredKind {
  const reasons: string[] = [];
  let score = 0;
  if (signals?.hasInterviewPattern) add("检测到 Q/A、问/答或 Interviewer/Interviewee 模式。", 4);
  if (signals?.hasDialogue) add("检测到较多对话式段落。", 2);
  if (/\b(interview|interviewer|interviewee)\b/i.test(lower) || /访谈|采访|受访者|采访者/.test(text)) add("检测到采访相关词。", 2);
  return { kind: "interview", score, reasons };
  function add(reason: string, value: number) {
    score += value;
    reasons.push(reason);
  }
}

function scoreBusinessReport(text: string, lower: string, signals: DocumentKindDetection["signals"]): ScoredKind {
  const reasons: string[] = [];
  let score = 0;
  if (signals?.hasBusinessTerms) add("检测到财报、ESG、营收、风险或战略等商业报告信号。", 4);
  if (/\b(revenue|profit|cash flow|shareholder|governance|market share)\b/i.test(lower) || /利润|现金流|市场份额|董事会|股东/.test(text)) add("检测到经营指标或治理词。", 2);
  if (/(20\d{2}|19\d{2}).{0,20}(年|年度|quarter|q[1-4])/i.test(text)) add("检测到年度 / 季度数据表达。", 1);
  return { kind: "business-report", score, reasons };
  function add(reason: string, value: number) {
    score += value;
    reasons.push(reason);
  }
}

function scoreFiction(text: string, _lower: string, signals: DocumentKindDetection["signals"]): ScoredKind {
  const reasons: string[] = [];
  let score = 0;
  if (signals?.hasFictionSignals) add("检测到人物、情节、场景或小说相关信号。", 2);
  if (signals?.hasChapters && !signals.hasReferences) add("检测到章节结构且缺少参考文献信号。", 2);
  if (/[“"][^”"]{2,80}[”"]/.test(text) || /他说|她说|我说|问道|回答道/.test(text)) add("检测到叙事或人物对话信号。", 2);
  if (!signals?.hasReferences && /第[一二三四五六七八九十百\d]+章/.test(text)) add("检测到小说式章节标题。", 2);
  return { kind: "fiction", score, reasons };
  function add(reason: string, value: number) {
    score += value;
    reasons.push(reason);
  }
}

function scoreManual(text: string, lower: string, signals: DocumentKindDetection["signals"]): ScoredKind {
  const reasons: string[] = [];
  let score = 0;
  if (signals?.hasProcedureSteps) add("检测到步骤、安装、配置、FAQ 或 Troubleshooting 信号。", 4);
  if (/\b(command|parameter|option|install|setup|configure)\b/i.test(lower) || /命令|参数|选项|安装|设置|配置/.test(text)) add("检测到命令、参数或配置说明。", 2);
  if (/注意|警告|提示|warning|note|caution/i.test(text)) add("检测到说明书常见提示 / 警告。", 1);
  return { kind: "manual", score, reasons };
  function add(reason: string, value: number) {
    score += value;
    reasons.push(reason);
  }
}

function scoreBookChapter(text: string, _lower: string, signals: DocumentKindDetection["signals"]): ScoredKind {
  const reasons: string[] = [];
  let score = 0;
  if (signals?.hasChapters) add("检测到 Chapter / 第 X 章结构。", 3);
  if (!signals?.hasReferences && /概念|定义|例子|本章|小结|练习/.test(text)) add("检测到书籍章节式概念解释或小结。", 2);
  if (signals?.hasReferences) score -= 1;
  return { kind: "book-chapter", score, reasons };
  function add(reason: string, value: number) {
    score += value;
    reasons.push(reason);
  }
}

function scoreArticle(text: string, lower: string): ScoredKind {
  const wordishLength = lower.replace(/[^a-z0-9\u4e00-\u9fff]/gi, "").length;
  const reasons = wordishLength >= 500 ? ["未检测到强论文、报告、采访、小说或说明书结构，按普通文章处理。"] : [];
  return { kind: "article", score: wordishLength >= 500 ? 2 : 0, reasons };
}

function hasInterviewPattern(text: string) {
  const patterns = [
    /^\s*(q|question)\s*[:：]/gim,
    /^\s*(a|answer)\s*[:：]/gim,
    /^\s*(问|提问)\s*[:：]/gm,
    /^\s*(答|回答)\s*[:：]/gm,
    /^\s*(interviewer|interviewee)\s*[:：]/gim,
    /^[\u4e00-\u9fffA-Z][\u4e00-\u9fffA-Za-z\s]{1,18}\s*[:：]/gm
  ];
  return patterns.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0) >= 4;
}

function hasDialogue(text: string) {
  const quoteCount = (text.match(/[“”"]/g) ?? []).length;
  const colonDialogue = (text.match(/^[\u4e00-\u9fffA-Z][\u4e00-\u9fffA-Za-z\s]{1,18}\s*[:：]/gm) ?? []).length;
  return quoteCount >= 8 || colonDialogue >= 5;
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeText(text: string) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function unknownDetection(reasons: string[], signals?: DocumentKindDetection["signals"]): DocumentKindDetection {
  return {
    kind: "unknown",
    confidence: "low",
    reasons,
    detectedAt: new Date().toISOString(),
    signals
  };
}
