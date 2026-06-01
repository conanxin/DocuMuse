"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisMode, ParsedDocument } from "@/lib/documentTypes";
import { ChatPanel } from "./ChatPanel";
import { CreativeOutputsPanel } from "./CreativeOutputsPanel";
import { GraphPanel } from "./GraphPanel";
import { OriginalTextPanel } from "./OriginalTextPanel";
import { OverviewPanel } from "./OverviewPanel";
import { SectionAnalysisPanel } from "./SectionAnalysisPanel";
import { TranslationPanel } from "./TranslationPanel";
import { WorkspaceSidebar, type WorkspaceTab } from "./WorkspaceSidebar";
import { WorkspaceTopbar } from "./WorkspaceTopbar";

export function DocumentWorkspace({ documentId = "demo" }: { documentId?: string }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [analysisError, setAnalysisError] = useState("");
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

  return (
    <main className="flex h-screen min-h-[760px] flex-col bg-slate-50">
      <WorkspaceTopbar
        title={document?.title}
        status={topbarStatus}
        onAnalyze={(mode) => void analyzeDocument(mode)}
        analyzing={analysisState === "loading"}
        isDemo={isDemo}
        hasAnalysis={hasAnalysis}
        analysisFailed={analysisFailed}
      />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <WorkspaceSidebar activeTab={activeTab} onChange={setActiveTab} />
        <section className="min-h-0 overflow-auto p-5 thin-scrollbar">
          {loadState === "loading" && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">正在读取文档...</div>}
          {loadState === "error" && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">{errorMessage}</div>}
          <AnalysisProcessPanel document={document} analyzing={analysisState === "loading"} />
          {analysisFailed && analysisError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{analysisError}</div>}
          {loadState === "idle" && document?.analysisDiagnostics?.repairedJson && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">模型输出格式已自动修复。</div>}
          {loadState === "idle" && <AnalysisModeNotice document={document} />}
          {loadState === "idle" && activeTab === "overview" && <OverviewPanel analysis={document?.analysis} />}
          {loadState === "idle" && activeTab === "original" && <OriginalTextPanel text={document?.text} pageCount={document?.pageCount} createdAt={document?.createdAt} />}
          {loadState === "idle" && !isDemo && activeTab === "translation" && !document?.analysis?.translationZh && <PlaceholderNotice />}
          {loadState === "idle" && activeTab === "translation" && <TranslationPanel translation={document?.analysis?.translationZh} />}
          {loadState === "idle" && activeTab === "analysis" && <SectionAnalysisPanel analysis={document?.analysis} />}
          {loadState === "idle" && !isDemo && activeTab === "graph" && <PlaceholderNotice />}
          {loadState === "idle" && activeTab === "graph" && <GraphPanel />}
          {loadState === "idle" && !isDemo && activeTab === "creative" && !document?.analysis?.pptOutline?.length && !document?.analysis?.podcastScript && !document?.analysis?.imagePrompts?.length && <PlaceholderNotice />}
          {loadState === "idle" && activeTab === "creative" && <CreativeOutputsPanel analysis={document?.analysis} />}
        </section>
        <ChatPanel isPlaceholder={!isDemo} />
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
