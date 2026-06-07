"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisMode, ChatSource, DocumentOutlineNode, EditableOutlineNode, ParsedDocument } from "@/lib/documentTypes";
import type { ExportPresetPlan, PptxExportOptions } from "@/lib/exporters/exportTypes";
import { createEditableOutlineFromAuto } from "@/lib/outlineUtils";
import type { ParagraphAnchor } from "@/lib/sourceAnchors";
import { ChatPanel } from "./ChatPanel";
import { CreativeOutputsPanel } from "./CreativeOutputsPanel";
import { GraphPanel } from "./GraphPanel";
import { OriginalTextPanel } from "./OriginalTextPanel";
import { OverviewPanel } from "./OverviewPanel";
import { PdfPreviewPanel } from "./PdfPreviewPanel";
import { SectionAnalysisPanel } from "./SectionAnalysisPanel";
import { TranslationPanel } from "./TranslationPanel";
import { WorkspaceSidebar, type WorkspaceTab } from "./WorkspaceSidebar";
import { WorkspaceTopbar } from "./WorkspaceTopbar";

export function DocumentWorkspace({ documentId = "demo" }: { documentId?: string }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "error">("idle");
  const [exportState, setExportState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [exportError, setExportError] = useState("");
  const [presetPlans, setPresetPlans] = useState<ExportPresetPlan[]>([]);
  const [exportingPresetId, setExportingPresetId] = useState<string | null>(null);
  const [presetMessage, setPresetMessage] = useState("");
  const [selectedSourceRange, setSelectedSourceRange] = useState<ChatSource | null>(null);
  const [selectedPdfSource, setSelectedPdfSource] = useState<ChatSource | null>(null);
  const pollRef = useRef<number | null>(null);
  const isDemo = documentId === "demo";

  const loadDocument = useCallback(
    async (cancelled?: () => boolean) => {
      setLoadState("loading");
      setErrorMessage("");

      try {
        const response = await fetch(`/api/documents/${documentId}`, { cache: "no-store" });
        const payload = await safeJson(response);
        if (!response.ok) {
          throw new Error(payload.error || "读取文档失败。");
        }
        if (!cancelled?.()) {
          setDocument(payload as ParsedDocument);
          setLoadState("idle");
          if (payload.analysisStatus === "failed" && payload.analysisError) {
            setAnalysisState("error");
            setAnalysisError(payload.analysisError);
          }
        }
      } catch (error) {
        if (!cancelled?.()) {
          setLoadState("error");
          setErrorMessage(error instanceof Error ? error.message : "读取文档失败。");
        }
      }
    },
    [documentId]
  );

  const pollAnalysisStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/analysis-status`, { cache: "no-store" });
      const payload = await safeJson(response);
      if (response.ok && payload.ok) {
        setDocument((current) => (current ? { ...current, ...payload } : current));
        if (payload.analysisStatus === "failed" && payload.analysisError) {
          setAnalysisState("error");
          setAnalysisError(payload.analysisError);
        }
      }
    } catch {
      // Polling is best-effort; the analyze request still reports final errors.
    }
  }, [documentId]);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (isDemo) return;

    let cancelled = false;
    void loadDocument(() => cancelled);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [isDemo, loadDocument]);

  useEffect(() => {
    if (isDemo) return;

    let cancelled = false;
    async function loadPresets() {
      try {
        const response = await fetch(`/api/documents/${documentId}/export/presets`, { cache: "no-store" });
        const payload = await safeJson(response);
        if (response.ok && payload.ok && !cancelled) {
          setPresetPlans(payload.presets ?? []);
        }
      } catch {
        if (!cancelled) {
          setPresetMessage("导出预设读取失败，但单项导出仍可使用。");
        }
      }
    }

    void loadPresets();
    return () => {
      cancelled = true;
    };
  }, [documentId, isDemo]);

  const analyzeDocument = async (mode: AnalysisMode) => {
    if (isDemo || analysisState === "loading") return;

    setAnalysisState("loading");
    setAnalysisError("");
    setDocument((current) =>
      current
        ? {
            ...current,
            analysisMode: mode,
            analysisStatus: "running",
            analysisProgress: {
              step: mode === "quick" ? "synthesis" : "chunking",
              message: mode === "quick" ? "正在进行快速分析。" : "正在切分全文。"
            }
          }
        : current
    );
    stopPolling();
    pollRef.current = window.setInterval(() => void pollAnalysisStatus(), 2000);

    try {
      const response = await fetch(`/api/documents/${documentId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const payload = await safeJson(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "分析失败。");
      }
      stopPolling();
      await loadDocument();
      setAnalysisState("idle");
      setActiveTab("overview");
    } catch (error) {
      stopPolling();
      setAnalysisState("error");
      setAnalysisError(error instanceof Error ? error.message : "分析失败。");
      await loadDocument();
    }
  };

  const hasAnalysis = document?.analysisStatus === "completed";
  const analysisFailed = analysisState === "error" || document?.analysisStatus === "failed";
  const topbarStatus = analysisState === "loading" ? "正在分析" : analysisFailed ? "失败" : document?.status === "parsed" ? "已解析" : undefined;
  const handleSourceClick = (source: ChatSource) => {
    setSelectedSourceRange(source);
    setActiveTab("original");
  };

  const handleSourcePdfClick = (source: ChatSource) => {
    setSelectedSourceRange(source);
    setSelectedPdfSource(source);
    setActiveTab("pdf");
  };

  const handleSectionClick = (source: ChatSource) => {
    setSelectedSourceRange(source);
    setActiveTab("original");
  };

  const handleAddOutlineHeading = async ({ anchor, title, level, type, insertAfterId }: { anchor: ParagraphAnchor; title: string; level: number; type: NonNullable<DocumentOutlineNode["type"]>; insertAfterId?: string }) => {
    if (!document || isDemo) return;
    const baseOutline =
      document.outlineEditState?.mode === "custom" && document.outlineEditState.customOutline?.length
        ? flattenEditableOutline(document.outlineEditState.customOutline)
        : flattenEditableOutline(createEditableOutlineFromAuto(document.outline ?? []));
    const now = new Date().toISOString();
    const manualNode: EditableOutlineNode = {
      id: `manual-outline-${Date.now()}`,
      title: title.slice(0, 180),
      level: Math.min(3, Math.max(1, Math.round(level))),
      index: baseOutline.length + 1,
      pageNumber: anchor.pageNumber,
      startParagraphId: anchor.paragraphId,
      endParagraphId: anchor.paragraphId,
      startChar: anchor.startChar,
      endChar: anchor.endChar,
      confidence: "low",
      type,
      manual: true,
      userEdited: true,
      originalTitle: anchor.text.slice(0, 180),
      updatedAt: now
    };

    try {
      const response = await fetch(`/api/documents/${document.id}/outline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "custom", customOutline: insertOutlineNode(baseOutline, manualNode, insertAfterId) })
      });
      const payload = await safeJson(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || "添加章节标题失败。");
      await loadDocument();
      setSelectedSourceRange({
        paragraphId: anchor.paragraphId,
        anchorId: anchor.id,
        outlineNodeId: manualNode.id,
        outlineTitle: manualNode.title,
        outlineType: manualNode.type,
        pageNumber: manualNode.pageNumber,
        sourceHint: manualNode.pageNumber ? `第 ${manualNode.pageNumber} 页 · ${manualNode.title}` : manualNode.title,
        quote: manualNode.title,
        startChar: manualNode.startChar ?? anchor.startChar,
        endChar: manualNode.endChar ?? anchor.endChar
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "添加章节标题失败。");
      setLoadState("error");
    }
  };

  const exportDocument = async (format: "markdown" | "json" | "pptx", only?: "chat", pptxOptions?: PptxExportOptions) => {
    setExportState("loading");
    setExportError("");

    try {
      if (isDemo) {
        if (format === "pptx") {
          throw new Error("Demo 文档暂不支持 PPTX 导出，请打开真实文档导出。");
        }
        downloadText(buildDemoExport(format, only), demoExportFilename(format, only), format === "json" ? "application/json;charset=utf-8" : "text/markdown;charset=utf-8");
        setExportState("idle");
        return;
      }

      const query = new URLSearchParams({ format });
      if (only) query.set("only", only);
      if (format === "pptx" && pptxOptions) {
        query.set("theme", pptxOptions.theme);
        query.set("cover", pptxOptions.cover);
        query.set("includeSummary", String(pptxOptions.includeSummary));
        query.set("includeKeyPoints", String(pptxOptions.includeKeyPoints));
        query.set("includeKeywords", String(pptxOptions.includeKeywords));
        query.set("includeSections", String(pptxOptions.includeSections));
        query.set("includeOutline", String(pptxOptions.includeOutline));
        query.set("includeCreative", String(pptxOptions.includeCreative));
        query.set("includeChat", String(pptxOptions.includeChat));
      }
      const response = await fetch(`/api/documents/${documentId}/export?${query.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await safeJson(response);
        throw new Error(payload.error || "Export failed.");
      }

      const blob = await response.blob();
      const filename = filenameFromDisposition(response.headers.get("Content-Disposition")) ?? `documuse-${documentId}.${format === "markdown" ? "md" : format}`;
      downloadBlob(blob, filename);
      setExportState("idle");
    } catch (error) {
      setExportState("error");
      setExportError(error instanceof Error ? error.message : "Export failed.");
    }
  };

  const exportPreset = async (preset: ExportPresetPlan) => {
    if (isDemo) {
      setPresetMessage("Demo 文档暂不支持预设导出，请打开真实文档后使用。");
      return;
    }

    setExportingPresetId(preset.presetId);
    setPresetMessage("");
    setExportError("");

    try {
      const response = await fetch(`/api/documents/${documentId}/export/preset?preset=${preset.presetId}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await safeJson(response);
        throw new Error(payload.error || "ZIP 下载失败。");
      }
      const blob = await response.blob();
      const filename = filenameFromDisposition(response.headers.get("Content-Disposition")) ?? `documuse-${preset.presetId}.zip`;
      downloadBlob(blob, filename);
      setPresetMessage(`已开始下载 ${preset.label} ZIP。`);
      setExportingPresetId(null);
    } catch (error) {
      setExportingPresetId(null);
      setPresetMessage(error instanceof Error ? `${error.message} 可改用单项导出按钮。` : "导出预设失败，可改用单项导出按钮。");
    }
  };

  return (
    <main className="flex h-screen min-h-[760px] flex-col bg-slate-50">
      <WorkspaceTopbar
        title={document?.title}
        status={topbarStatus}
        documentKind={document?.documentKind}
        onAnalyze={(mode) => void analyzeDocument(mode)}
        onExport={(format, only, pptxOptions) => void exportDocument(format, only, pptxOptions)}
        onExportPreset={(preset) => void exportPreset(preset)}
        presetPlans={presetPlans}
        presetMessage={presetMessage}
        exportingPresetId={exportingPresetId}
        analyzing={analysisState === "loading"}
        exporting={exportState === "loading"}
        isDemo={isDemo}
        hasAnalysis={hasAnalysis}
        analysisFailed={analysisFailed}
      />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[250px_minmax(0,1fr)_400px]">
        <WorkspaceSidebar activeTab={activeTab} onChange={setActiveTab} document={document} onSectionClick={handleSectionClick} onOutlineChanged={() => loadDocument()} isDemo={isDemo} />
        <section className="min-h-0 overflow-auto p-5 thin-scrollbar">
          {loadState === "loading" && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">正在读取文档...</div>}
          {loadState === "error" && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">{errorMessage}</div>}
          <AnalysisProcessPanel document={document} analyzing={analysisState === "loading"} />
          {analysisFailed && analysisError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{analysisError}</div>}
          {exportState === "error" && exportError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{exportError}</div>}
          {loadState === "idle" && document?.analysisDiagnostics?.repairedJson && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">模型输出格式已自动修复。</div>}
          {loadState === "idle" && <AnalysisModeNotice document={document} />}
          {loadState === "idle" && activeTab === "overview" && <OverviewPanel analysis={document?.analysis} documentKind={document?.documentKind} />}
          {loadState === "idle" && activeTab === "original" && <OriginalTextPanel document={document} text={document?.text} pageCount={document?.pageCount} createdAt={document?.createdAt} highlight={selectedSourceRange} onClearHighlight={() => setSelectedSourceRange(null)} onAddOutlineHeading={isDemo ? undefined : (payload) => void handleAddOutlineHeading(payload)} />}
          {loadState === "idle" && activeTab === "pdf" && <PdfPreviewPanel documentId={documentId} selectedSource={selectedPdfSource ?? selectedSourceRange} />}
          {loadState === "idle" && !isDemo && activeTab === "translation" && !document?.analysis?.translationZh && <PlaceholderNotice />}
          {loadState === "idle" && activeTab === "translation" && <TranslationPanel translation={document?.analysis?.translationZh} />}
          {loadState === "idle" && activeTab === "analysis" && <SectionAnalysisPanel analysis={document?.analysis} />}
          {loadState === "idle" && !isDemo && activeTab === "graph" && <PlaceholderNotice />}
          {loadState === "idle" && activeTab === "graph" && <GraphPanel />}
          {loadState === "idle" && !isDemo && activeTab === "creative" && !document?.analysis?.pptOutline?.length && !document?.analysis?.podcastScript && !document?.analysis?.imagePrompts?.length && <PlaceholderNotice />}
          {loadState === "idle" && activeTab === "creative" && <CreativeOutputsPanel analysis={document?.analysis} />}
        </section>
        <ChatPanel documentId={documentId} documentTitle={document?.title} isPlaceholder={!isDemo} initialMessages={document?.chatMessages ?? []} selectedSource={selectedSourceRange} onSourceClick={handleSourceClick} onSourcePdfClick={handleSourcePdfClick} />
      </div>
    </main>
  );
}

function AnalysisModeNotice({ document }: { document: ParsedDocument | null }) {
  if (!document) return null;
  if (document.analysisMode === "quick") {
    return <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">当前为快速分析，仅覆盖文档前部内容。</div>;
  }
  if (document.analysisMode === "full" && document.analysisStatus === "completed") {
    return <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">当前为完整分块分析，已综合全文多个文本块。</div>;
  }
  if (!document.analysisMode) {
    return <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">你可以选择“快速分析”预览文档前部，也可以选择“完整分析”对全文分块处理。</div>;
  }
  return null;
}

function AnalysisProcessPanel({ document, analyzing }: { document: ParsedDocument | null; analyzing: boolean }) {
  const progress = document?.analysisProgress;
  const totalChunks = progress?.totalChunks ?? document?.chunks?.length;
  const completedChunks = progress?.completedChunks ?? (document?.analysisStatus === "completed" ? totalChunks : 0);
  const steps = [
    { label: "提取 PDF 文本", status: "已完成" },
    { label: "文本切分", status: totalChunks ? `已完成，共 ${totalChunks} 段` : analyzing ? "进行中" : "等待分析" },
    {
      label: "分块分析",
      status:
        progress?.step === "chunk_analysis"
          ? `正在分析第 ${progress.currentChunk ?? completedChunks ?? 1} / ${totalChunks ?? "?"} 段`
          : document?.analysisStatus === "completed"
            ? "已完成"
            : document?.analysisStatus === "failed"
              ? "失败"
              : "等待分析"
    },
    { label: "全局汇总", status: progress?.step === "synthesis" ? "进行中" : document?.analysisStatus === "completed" ? "已完成" : "等待分析" },
    { label: "结果保存", status: document?.analysisStatus === "completed" ? "已完成" : document?.analysisStatus === "failed" ? "失败" : progress?.step === "saving" ? "进行中" : "等待分析" }
  ];

  return (
    <details className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" open={analyzing || document?.analysisStatus === "failed"}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">分析过程</summary>
      <div className="mt-4 grid gap-3">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="font-medium text-slate-700">
              {index + 1}. {step.label}
            </span>
            <span className="text-slate-500">{step.status}</span>
          </div>
        ))}
        {progress?.message && <p className="text-sm text-blue-700">{progress.message}</p>}
      </div>
    </details>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return { error: "服务返回了无法解析的响应。" };
  }
}

function PlaceholderNotice() {
  return <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">此模块将在 LLM 接入后生成真实内容。</div>;
}
function downloadText(content: string, filename: string, type: string) {
  downloadBlob(new Blob([content], { type }), filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function filenameFromDisposition(disposition: string | null) {
  if (!disposition) return null;
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return disposition.match(/filename="([^"]+)"/)?.[1] ?? null;
}

function flattenEditableOutline(nodes: EditableOutlineNode[]): EditableOutlineNode[] {
  const flattened: EditableOutlineNode[] = [];
  for (const node of nodes) {
    const { children, ...rest } = node;
    flattened.push({ ...rest, children: undefined });
    if (children?.length) flattened.push(...flattenEditableOutline(children as EditableOutlineNode[]));
  }
  return flattened.map((node, index) => ({ ...node, index: index + 1 }));
}

function insertOutlineNode(nodes: EditableOutlineNode[], node: EditableOutlineNode, insertAfterId?: string) {
  const next = [...nodes];
  const targetIndex = insertAfterId ? next.findIndex((item) => item.id === insertAfterId) : -1;
  if (targetIndex >= 0) {
    next.splice(targetIndex + 1, 0, node);
  } else {
    next.push(node);
  }
  return next.map((item, index) => ({ ...item, index: index + 1, children: undefined }));
}

function demoExportFilename(format: "markdown" | "json", only?: "chat") {
  const prefix = only === "chat" ? "documuse-chat" : "documuse";
  return `${prefix}-demo-interview.${format === "json" ? "json" : "md"}`;
}

function buildDemoExport(format: "markdown" | "json", only?: "chat") {
  const exportedAt = new Date().toISOString();
  const payload = {
    exportedAt,
    metadata: {
      id: "demo",
      title: "demo-interview.pdf",
      filename: "demo-interview.pdf",
      fileType: "pdf",
      analysisStatus: "mock"
    },
    note: "Demo export uses mock content only. It does not include API keys, prompts, raw model output, or full document text.",
    chatMessages:
      only === "chat"
        ? [
            { role: "assistant", content: "Demo assistant message.", sources: [{ sourceHint: "Demo source", quote: "Short demo quote." }] }
          ]
        : undefined
  };

  if (format === "json") {
    return JSON.stringify(payload, null, 2);
  }

  if (only === "chat") {
    return ["# DocuMuse Document Q&A Record", "", "Document: demo-interview.pdf", `Exported at: ${new Date(exportedAt).toLocaleString("zh-CN")}`, "", "## Q&A", "", "Demo assistant message.", "", "### Sources", "", "- Demo source: Short demo quote.", ""].join("\n");
  }

  return [
    "# DocuMuse Document Analysis Report",
    "",
    "Document: demo-interview.pdf",
    `Exported at: ${new Date(exportedAt).toLocaleString("zh-CN")}`,
    "",
    "## 1. One-Sentence Summary",
    "",
    "This is a mock demo export for the sample workspace.",
    "",
    "## 10. Document Q&A Record",
    "",
    "Demo content only.",
    ""
  ].join("\n");
}
