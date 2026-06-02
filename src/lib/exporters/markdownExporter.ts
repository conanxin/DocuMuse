import type { ParsedDocument } from "../documentTypes";
import { buildDocumentJsonExport, truncate } from "./jsonExporter";
import type { DocumentExportOptions, SafeDocumentExport, SafeExportChatMessage } from "./exportTypes";

export function buildDocumentMarkdownExport(document: ParsedDocument, options: Partial<DocumentExportOptions> = {}) {
  const exported = buildDocumentJsonExport(document, options);
  if (options.only === "chat") {
    return buildChatOnlyMarkdown(exported);
  }
  return buildFullMarkdown(exported);
}

function buildFullMarkdown(exported: SafeDocumentExport) {
  const lines: string[] = [
    "# DocuMuse Document Analysis Report",
    "",
    `Document: ${exported.metadata.title || exported.metadata.filename}`,
    `Exported at: ${formatDate(exported.exportedAt)}`,
    `Analysis model: ${exported.metadata.analysisModel || "Not generated"}`,
    `Analysis provider: ${exported.metadata.analysisProvider || "Not generated"}`,
    `Analysis mode: ${exported.metadata.analysisMode || "Not generated"}`,
    `Analysis status: ${exported.metadata.analysisStatus || "Not generated"}`,
    "",
    "## 0. Document Metadata",
    "",
    `- Filename: ${exported.metadata.filename}`,
    `- File type: ${exported.metadata.fileType}`,
    `- Created at: ${formatDate(exported.metadata.createdAt)}`,
    `- Page count: ${exported.metadata.pageCount || 0}`,
    `- Text length: ${exported.metadata.textLength}`,
    `- Analyzed at: ${exported.metadata.analyzedAt ? formatDate(exported.metadata.analyzedAt) : "Not generated"}`,
    ""
  ];

  const analysis = exported.analysis;
  if (!analysis) {
    lines.push("Analysis has not been generated.", "");
    appendChat(lines, exported.chatMessages);
    return lines.join("\n");
  }

  lines.push("## 1. One-Sentence Summary", "", analysis.oneSentenceSummary || "Not generated.", "");
  lines.push("## 2. Full Summary", "", analysis.summary || "Not generated.", "");
  lines.push("## 3. Key Points", "");
  appendList(lines, analysis.keyPoints);
  lines.push("## 4. Keywords", "");
  appendList(lines, analysis.keywords);
  lines.push("## 5. Section Analysis", "");
  if (analysis.sectionSummaries.length) {
    analysis.sectionSummaries.forEach((section, index) => {
      lines.push(`### ${index + 1}. ${section.title || `Section ${index + 1}`}`, "", `Summary: ${section.summary || "Not generated."}`, "");
      if (section.sourceHint) lines.push(`Source: ${section.sourceHint}`, "");
      lines.push("Key points:");
      appendList(lines, section.keyPoints);
      lines.push("Quotes:");
      if (section.quotes.length) {
        section.quotes.forEach((quote) => lines.push(`> ${quote}`));
        lines.push("");
      } else {
        lines.push("- Not generated.", "");
      }
    });
  } else {
    lines.push("Not generated.", "");
  }

  lines.push("## 6. Chinese Translation / Rewrite", "", analysis.translationZh || "Not generated.", "");

  lines.push("## 7. PPT Outline", "");
  if (analysis.pptOutline?.length) {
    analysis.pptOutline.forEach((slide, index) => {
      lines.push(`### Slide ${index + 1}: ${slide.title || "Untitled"}`, "");
      appendList(lines, slide.bullets);
    });
  } else {
    lines.push("Not generated.", "");
  }

  lines.push("## 8. Podcast Script", "", analysis.podcastScript || "Not generated.", "");

  lines.push("## 9. Image Prompts", "");
  if (analysis.imagePrompts?.length) {
    analysis.imagePrompts.forEach((item) => lines.push(`### ${item.title || "Prompt"}`, "", item.prompt || "Not generated.", ""));
  } else {
    lines.push("Not generated.", "");
  }

  if (exported.chunkAnalysis) {
    lines.push("## 10. Chunked Analysis", "", `Chunk count: ${exported.chunkAnalysis.chunkCount}`, "");
    if (exported.chunkAnalysis.chunkAnalyses.length) {
      exported.chunkAnalysis.chunkAnalyses.forEach((chunk, index) => {
        lines.push(`### Chunk ${index + 1}: ${chunk.title || chunk.chunkId}`, "", chunk.summary || "Not generated.", "");
        appendList(lines, chunk.keyPoints);
      });
    } else {
      lines.push("Chunk analysis details were not generated.", "");
    }
  }

  appendChat(lines, exported.chatMessages);
  return lines.join("\n");
}

function buildChatOnlyMarkdown(exported: SafeDocumentExport) {
  const lines = [
    "# DocuMuse Document Q&A Record",
    "",
    `Document: ${exported.metadata.title || exported.metadata.filename}`,
    `Exported at: ${formatDate(exported.exportedAt)}`,
    ""
  ];
  appendChat(lines, exported.chatMessages, "##");
  return lines.join("\n");
}

function appendChat(lines: string[], messages?: SafeExportChatMessage[], heading = "##") {
  lines.push(`${heading} 10. Document Q&A Record`, "");
  if (!messages?.length) {
    lines.push("No chat records.", "");
    return;
  }

  let questionIndex = 0;
  for (const message of messages) {
    if (message.role === "user") {
      questionIndex += 1;
      lines.push(`### Q${questionIndex}`, "", `User: ${message.content}`, "");
      continue;
    }

    lines.push("#### Answer", "", message.content, "");
    if (message.sources?.length) {
      lines.push("#### Sources", "");
      message.sources.forEach((source) => {
        const anchor = source.anchorId ? ` (${source.anchorId})` : "";
        lines.push(`- ${source.sourceHint}${anchor}: ${truncate(source.quote, 300)}`);
      });
      lines.push("");
    }
  }
}

function appendList(lines: string[], items: string[]) {
  if (!items.length) {
    lines.push("- Not generated.", "");
    return;
  }
  items.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Unknown";
  return date.toLocaleString("zh-CN");
}
