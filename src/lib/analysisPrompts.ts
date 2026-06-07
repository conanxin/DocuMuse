import { documentKindPromptHint } from "./documentKindDetector";
import type { DocumentKind, DocumentKindDetection } from "./documentTypes";

const MAX_ANALYSIS_CHARS = 16000;
const MAX_REPAIR_INPUT_CHARS = 12000;

const ANALYSIS_SCHEMA = `{
  "title": "",
  "documentType": "",
  "language": "",
  "oneSentenceSummary": "",
  "summary": "",
  "keyPoints": [],
  "keywords": [],
  "sectionSummaries": [
    {
      "title": "",
      "summary": "",
      "keyPoints": [],
      "quotes": [],
      "sourceHint": ""
    }
  ],
  "translationZh": "",
  "pptOutline": [
    {
      "title": "",
      "bullets": []
    }
  ],
  "podcastScript": "",
  "imagePrompts": [
    {
      "title": "",
      "prompt": ""
    }
  ]
}`;

const CHUNK_ANALYSIS_SCHEMA = `{
  "chunkId": "",
  "title": "",
  "summary": "",
  "keyPoints": [],
  "keywords": [],
  "quotes": [],
  "entities": [],
  "sourceHint": ""
}`;

export function getAnalysisTextSlice(text: string) {
  const normalized = text.replace(/\s+\n/g, "\n").trim();
  return {
    textForAnalysis: normalized.slice(0, MAX_ANALYSIS_CHARS),
    isPartialAnalysis: normalized.length > MAX_ANALYSIS_CHARS,
    analyzedTextLength: Math.min(normalized.length, MAX_ANALYSIS_CHARS)
  };
}

type DocumentKindHint = DocumentKind | DocumentKindDetection | undefined;

function resolveKind(kind: DocumentKindHint) {
  return typeof kind === "string" ? kind : kind?.kind;
}

export function buildDocumentAnalysisMessages(documentTitle: string, text: string, documentKind?: DocumentKindHint) {
  const { textForAnalysis, isPartialAnalysis } = getAnalysisTextSlice(text);
  const kindHint = documentKindPromptHint(resolveKind(documentKind));

  return [
    {
      role: "system",
      content: [
        "You are DocuMuse, an AI document reading workspace.",
        kindHint,
        "Return one valid JSON object only.",
        "Do not output Markdown, code fences, explanations, prefaces, suffixes, or extra text.",
        "Write primarily in Chinese.",
        "Do not invent facts outside the document.",
        "If the document does not clearly state something, write: 文档中未明确说明.",
        "All fields must exist. Use empty strings or empty arrays when content cannot be generated."
      ].join(" ")
    },
    {
      role: "user",
      content: `文档标题：${documentTitle}

分析要求：
- 识别文档类型，可能是采访、文章、论文、小说节选、报告或其他文档。
- 输出适合阅读工作台展示的结构化内容。
- 保留关键引用，但每条引用不要过长。
- 如果原文不是中文，请提供中文翻译/改写；如果原文已是中文，可以给出更通顺的中文改写，或说明原文已为中文。
- ${isPartialAnalysis ? "当前仅分析文档前部内容，请在 summary 中说明这一点。" : "当前分析全文。"}
- 不要编造文档外事实；不确定的内容写“文档中未明确说明”。
- 必须返回完整 JSON 字段；无法生成的字符串填空字符串，无法生成的列表填空数组。

只返回如下 JSON 对象，不要输出 Markdown：
${ANALYSIS_SCHEMA}

文档文本：
${textForAnalysis}`
    }
  ] as const;
}

export function buildJsonRepairMessages(rawModelOutput: string) {
  const safeOutput = rawModelOutput.slice(0, MAX_REPAIR_INPUT_CHARS);

  return [
    {
      role: "system",
      content: [
        "You repair malformed JSON for DocuMuse.",
        "Return one valid JSON object only.",
        "Do not output Markdown, code fences, explanations, prefaces, suffixes, or extra text.",
        "Do not invent facts beyond the provided model output.",
        "If a field cannot be recovered, use an empty string or empty array.",
        "Prefer Chinese content when content is recoverable."
      ].join(" ")
    },
    {
      role: "user",
      content: `请把下面的模型输出修复为符合目标 schema 的合法 JSON。

规则：
- 只输出 JSON。
- 不要输出 Markdown。
- 不要解释修复过程。
- 不要补充文档外事实。
- 缺失字符串字段补空字符串。
- 缺失数组字段补空数组。

目标 JSON schema：
${ANALYSIS_SCHEMA}

需要修复的模型输出：
${safeOutput}`
    }
  ] as const;
}

export function buildChunkJsonRepairMessages(rawModelOutput: string) {
  const safeOutput = rawModelOutput.slice(0, MAX_REPAIR_INPUT_CHARS);

  return [
    {
      role: "system",
      content: [
        "You repair malformed chunk analysis JSON for DocuMuse.",
        "Return one valid JSON object only.",
        "Do not output Markdown, code fences, explanations, prefaces, suffixes, or extra text.",
        "Do not invent facts beyond the provided model output.",
        "If a field cannot be recovered, use an empty string or empty array.",
        "Prefer Chinese content when content is recoverable."
      ].join(" ")
    },
    {
      role: "user",
      content: `请把下面的 chunk analysis 模型输出修复为符合目标 schema 的合法 JSON。

规则：
- 只输出 JSON。
- 不要输出 Markdown。
- 不要解释修复过程。
- 不要补充文档外事实。
- 缺失字符串字段补空字符串。
- 缺失数组字段补空数组。

目标 JSON schema：
${CHUNK_ANALYSIS_SCHEMA}

需要修复的模型输出：
${safeOutput}`
    }
  ] as const;
}

export function buildChunkAnalysisMessages(chunk: { id: string; index: number; text: string; sourceHint: string }, documentTitle: string, documentKind?: DocumentKindHint) {
  return [
    {
      role: "system",
      content: [
        "You analyze one text chunk for DocuMuse.",
        documentKindPromptHint(resolveKind(documentKind)),
        "Return one valid JSON object only.",
        "Do not output Markdown, code fences, explanations, prefaces, suffixes, or extra text.",
        "Use Chinese.",
        "Only use facts from the current chunk.",
        "If content is unclear, use empty strings or empty arrays."
      ].join(" ")
    },
    {
      role: "user",
      content: `文档标题：${documentTitle}
当前文本块：${chunk.sourceHint}

只基于当前文本块生成 JSON：
${CHUNK_ANALYSIS_SCHEMA}

要求：
- 不要编造当前文本块之外的内容。
- 引用不要太长。
- 没有内容时返回空数组或空字符串。

文本块：
${chunk.text}`
    }
  ] as const;
}

export function buildGlobalSynthesisMessages(chunkAnalyses: unknown[], documentTitle: string, documentKind?: DocumentKindHint) {
  return [
    {
      role: "system",
      content: [
        "You synthesize chunk analyses for DocuMuse.",
        documentKindPromptHint(resolveKind(documentKind)),
        "Return one valid JSON object only.",
        "Do not output Markdown, code fences, explanations, prefaces, suffixes, or extra text.",
        "Use Chinese.",
        "Do not invent facts outside the provided chunk analyses.",
        "All fields must exist. Use empty strings or empty arrays when needed."
      ].join(" ")
    },
    {
      role: "user",
      content: `文档标题：${documentTitle}

请综合所有 chunk analysis，输出完整文档分析 JSON。
不要重复堆砌，尽量标明内容来自哪些部分。

目标 JSON schema：
${ANALYSIS_SCHEMA}

chunk analyses：
${JSON.stringify(chunkAnalyses).slice(0, 24000)}`
    }
  ] as const;
}
