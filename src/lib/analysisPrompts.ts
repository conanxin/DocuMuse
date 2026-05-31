const MAX_ANALYSIS_CHARS = 16000;

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
      content:
        "You are DocuMuse, an AI document reading workspace. Analyze the provided document text and return strict JSON only. Do not use Markdown fences. Write primarily in Chinese. Do not invent facts outside the document. If something is unclear, say 文档中未明确说明."
    },
    {
      role: "user",
      content: `文档标题：${documentTitle}

分析要求：
- 识别文档类型，可能是采访、文章、论文、小说节选、报告或其他文档。
- 输出适合阅读工作台展示的结构化内容。
- 保留关键引用，但每条引用不要过长。
- 如果原文不是中文，请提供中文翻译/改写；如果原文已是中文，可给出更通顺的中文改写或说明原文已为中文。
- 当前${isPartialAnalysis ? "仅分析文档前部内容，请在 summary 中说明这一点。" : "分析全文。"}

必须返回 JSON 对象，字段如下：
{
  "title": string,
  "documentType": string,
  "language": string,
  "oneSentenceSummary": string,
  "summary": string,
  "keyPoints": string[],
  "keywords": string[],
  "sectionSummaries": [
    {
      "title": string,
      "summary": string,
      "keyPoints": string[],
      "quotes": string[],
      "sourceHint": string
    }
  ],
  "translationZh": string,
  "pptOutline": [
    {
      "title": string,
      "bullets": string[]
    }
  ],
  "podcastScript": string,
  "imagePrompts": [
    {
      "title": string,
      "prompt": string
    }
  ]
}

文档文本：
${textForAnalysis}`
    }
  ] as const;
}
