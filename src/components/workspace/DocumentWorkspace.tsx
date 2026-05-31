"use client";

import { useEffect, useState } from "react";
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
  const [errorMessage, setErrorMessage] = useState("");
  const isDemo = documentId === "demo";

  useEffect(() => {
    if (isDemo) return;

    let cancelled = false;
    setLoadState("loading");
    setErrorMessage("");

    fetch(`/api/documents/${documentId}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "读取文档失败。");
        }
        return payload as ParsedDocument;
      })
      .then((payload) => {
        if (!cancelled) {
          setDocument(payload);
          setLoadState("idle");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadState("error");
          setErrorMessage(error instanceof Error ? error.message : "读取文档失败。");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, isDemo]);

  return (
    <main className="flex h-screen min-h-[760px] flex-col bg-slate-50">
      <WorkspaceTopbar title={document?.title} status={document?.status === "parsed" ? "已解析" : undefined} />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <WorkspaceSidebar activeTab={activeTab} onChange={setActiveTab} />
        <section className="min-h-0 overflow-auto p-5 thin-scrollbar">
          {loadState === "loading" && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">正在读取文档...</div>}
          {loadState === "error" && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">{errorMessage}</div>}
          {loadState === "idle" && activeTab === "overview" && <OverviewPanel analysis={document?.analysis} />}
          {loadState === "idle" && activeTab === "original" && <OriginalTextPanel text={document?.text} pageCount={document?.pageCount} createdAt={document?.createdAt} />}
          {loadState === "idle" && !isDemo && activeTab === "translation" && <PlaceholderNotice />}
          {loadState === "idle" && activeTab === "translation" && <TranslationPanel />}
          {loadState === "idle" && activeTab === "analysis" && <SectionAnalysisPanel />}
          {loadState === "idle" && !isDemo && activeTab === "graph" && <PlaceholderNotice />}
          {loadState === "idle" && activeTab === "graph" && <GraphPanel />}
          {loadState === "idle" && !isDemo && activeTab === "creative" && <PlaceholderNotice />}
          {loadState === "idle" && activeTab === "creative" && <CreativeOutputsPanel />}
        </section>
        <ChatPanel isPlaceholder={!isDemo} />
      </div>
    </main>
  );
}

function PlaceholderNotice() {
  return (
    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      此模块将在 LLM 接入后生成真实内容。
    </div>
  );
}
