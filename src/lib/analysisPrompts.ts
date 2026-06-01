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

export function getAnalysisTextSlice(text: string) {
  const normalized = text.replace(/\s+\n/g, "\n").trim();
  return {
    textForAnalysis: normalized.slice(0, MAX_ANALYSIS_CHARS),
    isPartialAnalysis: normalized.length > MAX_ANALYSIS_CHARS,
    analyzedTextLength: Math.min(normalized.length, MAX_ANALYSIS_CHARS)
  };
}

export function buildDocumentAnalysisMessages(documentTitle: string, text: string) {
  const { textForAnalysis, isPartialAnalysis } = getAnalysisTextSlice(text);

  return [
    {
      role: "system",
      content: [
        "You are DocuMuse, an AI document reading workspace.",
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
