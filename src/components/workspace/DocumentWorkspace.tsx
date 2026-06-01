"use client";

import { useCallback, useEffect, useState } from "react";
import type { ParsedDocument } from "@/lib/documentTypes";
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

  useEffect(() => {
    if (isDemo) return;

    let cancelled = false;
    void loadDocument(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [isDemo, loadDocument]);

  const analyzeDocument = async () => {
    if (isDemo || analysisState === "loading") return;

    setAnalysisState("loading");
    setAnalysisError("");

    try {
      const response = await fetch(`/api/documents/${documentId}/analyze`, { method: "POST" });
      const payload = await safeJson(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "分析失败。");
      }
      await loadDocument();
      setAnalysisState("idle");
      setActiveTab("overview");
    } catch (error) {
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
        onAnalyze={() => void analyzeDocument()}
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
          {analysisState === "loading" && <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">正在分析文档，请稍候...</div>}
          {analysisFailed && analysisError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{analysisError}</div>}
          {loadState === "idle" && document?.analysisDiagnostics?.repairedJson && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">模型输出格式已自动修复。</div>}
          {loadState === "idle" && document?.analysisTruncated && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">当前仅分析文档前部内容，长文完整分块分析将在后续版本支持。</div>}
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

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return { error: "服务返回了无法解析的响应。" };
  }
}

function PlaceholderNotice() {
  return (
    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      此模块将在 LLM 接入后生成真实内容。
    </div>
  );
}
