"use client";

import { useState } from "react";
import { ChatPanel } from "./ChatPanel";
import { CreativeOutputsPanel } from "./CreativeOutputsPanel";
import { GraphPanel } from "./GraphPanel";
import { OriginalTextPanel } from "./OriginalTextPanel";
import { OverviewPanel } from "./OverviewPanel";
import { SectionAnalysisPanel } from "./SectionAnalysisPanel";
import { TranslationPanel } from "./TranslationPanel";
import { WorkspaceSidebar, type WorkspaceTab } from "./WorkspaceSidebar";
import { WorkspaceTopbar } from "./WorkspaceTopbar";

export function DocumentWorkspace() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  return (
    <main className="flex h-screen min-h-[760px] flex-col bg-slate-50">
      <WorkspaceTopbar />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <WorkspaceSidebar activeTab={activeTab} onChange={setActiveTab} />
        <section className="min-h-0 overflow-auto p-5 thin-scrollbar">
          {activeTab === "overview" && <OverviewPanel />}
          {activeTab === "original" && <OriginalTextPanel />}
          {activeTab === "translation" && <TranslationPanel />}
          {activeTab === "analysis" && <SectionAnalysisPanel />}
          {activeTab === "graph" && <GraphPanel />}
          {activeTab === "creative" && <CreativeOutputsPanel />}
        </section>
        <ChatPanel />
      </div>
    </main>
  );
}
