import type { SearchChunk } from "./documentSearch";

export function buildDocumentChatMessages(question: string, relevantChunks: SearchChunk[], documentTitle: string) {
  const context = relevantChunks
    .map((chunk) => `[${chunk.sourceHint}]\n${chunk.text}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "You answer questions for DocuMuse based only on the provided document excerpts.",
        "Answer in Chinese.",
        "Be concise but informative.",
        "Do not invent facts outside the excerpts.",
        "If the excerpts are insufficient, say: 文档中未明确说明。",
        "For summary questions, synthesize across multiple excerpts.",
        "For detail questions, prioritize the most relevant excerpt.",
        "The UI will display citations separately, so do not append long source lists.",
        "Do not fabricate source names, pages, or citations."
      ].join(" ")
    },
    {
      role: "user",
      content: `文档标题：${documentTitle}

用户问题：
${question}

可用文档片段：
${context}

请只基于上述片段回答。`
    }
  ] as const;
}
