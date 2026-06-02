import type { ParsedDocument } from "../documentTypes";
import { buildSafeExportFilename } from "./jsonExporter";
import type { ExportPresetId, ExportPresetPlan, PresetExportFile } from "./exportTypes";

type ExportPresetDefinition = {
  id: ExportPresetId;
  label: string;
  description: string;
  fileTypes: string[];
};

const PRESETS: ExportPresetDefinition[] = [
  {
    id: "study-notes",
    label: "学习笔记包",
    description: "适合复习和个人整理，包含分析报告与问答记录。",
    fileTypes: ["Markdown 报告", "问答 Markdown"]
  },
  {
    id: "presentation-pack",
    label: "汇报材料包",
    description: "适合会议或课程汇报，包含 PPTX 与 Markdown 报告。",
    fileTypes: ["PPTX", "Markdown 报告"]
  },
  {
    id: "research-digest",
    label: "研究摘录包",
    description: "适合保存结构化研究材料，包含报告、JSON 与问答记录。",
    fileTypes: ["Markdown 报告", "JSON 数据", "问答 Markdown"]
  },
  {
    id: "podcast-prep",
    label: "播客准备包",
    description: "适合准备播客脚本和创意素材，第一版使用普通 Markdown 报告承载内容。",
    fileTypes: ["Markdown 报告"]
  },
  {
    id: "full-archive",
    label: "完整归档包",
    description: "适合完整留档，包含 Markdown、JSON、PPTX 与问答记录。",
    fileTypes: ["Markdown 报告", "JSON 数据", "PPTX", "问答 Markdown"]
  }
];

export function getExportPresets() {
  return PRESETS;
}

export function getExportPresetById(id: string) {
  return PRESETS.find((preset) => preset.id === id);
}

export function buildPresetExportPlan(presetId: ExportPresetId, document: ParsedDocument): ExportPresetPlan {
  const preset = getExportPresetById(presetId);
  if (!preset) {
    throw new Error("Export preset does not exist.");
  }

  return {
    presetId,
    label: preset.label,
    description: preset.description,
    files: buildPresetFiles(presetId, document)
  };
}

export function buildAllPresetExportPlans(document: ParsedDocument): ExportPresetPlan[] {
  return PRESETS.map((preset) => buildPresetExportPlan(preset.id, document));
}

function buildPresetFiles(presetId: ExportPresetId, document: ParsedDocument): PresetExportFile[] {
  switch (presetId) {
    case "study-notes":
      return [markdownFile(document), chatMarkdownFile(document)];
    case "presentation-pack":
      return [
        pptxFile(document, "theme=blue&cover=report&includeSummary=true&includeKeyPoints=true&includeKeywords=true&includeSections=true&includeOutline=true&includeCreative=false&includeChat=false"),
        markdownFile(document)
      ];
    case "research-digest":
      return [markdownFile(document), jsonFile(document), chatMarkdownFile(document)];
    case "podcast-prep":
      return [markdownFile(document)];
    case "full-archive":
      return [markdownFile(document), jsonFile(document), pptxFile(document), chatMarkdownFile(document)];
  }
}

function markdownFile(document: ParsedDocument): PresetExportFile {
  return {
    format: "markdown",
    filename: buildSafeExportFilename(document, "md", "documuse-report"),
    url: `/api/documents/${document.id}/export?format=markdown`
  };
}

function jsonFile(document: ParsedDocument): PresetExportFile {
  return {
    format: "json",
    filename: buildSafeExportFilename(document, "json", "documuse-data"),
    url: `/api/documents/${document.id}/export?format=json`
  };
}

function pptxFile(document: ParsedDocument, query = "theme=blue&cover=report"): PresetExportFile {
  return {
    format: "pptx",
    filename: buildSafeExportFilename(document, "pptx", "documuse-slides"),
    url: `/api/documents/${document.id}/export?format=pptx&${query}`
  };
}

function chatMarkdownFile(document: ParsedDocument): PresetExportFile {
  return {
    format: "chat-markdown",
    filename: buildSafeExportFilename(document, "md", "documuse-chat"),
    url: `/api/documents/${document.id}/export?format=markdown&only=chat`
  };
}
