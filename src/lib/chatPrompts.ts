import { documentKindPromptHint } from "./documentKindDetector";
import type { SearchChunk } from "./documentSearch";
import type { DocumentKindDetection } from "./documentTypes";

export function buildDocumentChatMessages(question: string, relevantChunks: SearchChunk[], documentTitle: string, documentKind?: DocumentKindDetection) {
  const context = relevantChunks
    .map((chunk) => `[${chunk.sourceHint}]\n${chunk.text}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "You answer questions for DocuMuse based only on the provided document excerpts.",
        documentKindPromptHint(documentKind?.kind),
        "Answer primarily in Chinese, while preserving necessary English terms.",
        "Use Markdown that is easy to render in a chat UI.",
        "Use this structure whenever possible:",
        "### 直接回答",
        "### 关键依据",
        "### 可引用句子",
        "Keep the answer concise, readable, and clearly separated into short paragraphs or bullets.",
        "Do not invent facts outside the excerpts.",
        "If the excerpts are insufficient, write exactly: 文档中未明确说明。",
        "The UI displays source cards separately, so do not append long source lists in the answer body.",
        "Do not paste large source excerpts into the answer body.",
        "If quotes are necessary, output at most 3 quotes and keep each quote under 120 Chinese characters or similar length.",
        "Do not fabricate source names, pages, citations, or document facts."
      ].join(" ")
    },
    {
      role: "user",
      content: `文档标题：${documentTitle}

用户问题：${question}

可用文档片段：
${context}

请只基于上述片段回答，并使用 Markdown 输出。`
    }
  ] as const;
}
