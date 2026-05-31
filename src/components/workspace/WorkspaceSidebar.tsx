import { BarChart3, FileText, Languages, Lightbulb, Network, ScrollText } from "lucide-react";
import { mockDocumentOutline } from "@/lib/mockData";

export type WorkspaceTab = "overview" | "original" | "translation" | "analysis" | "graph" | "creative";

const navItems = [
  { id: "overview" as const, label: "总览", icon: BarChart3 },
  { id: "original" as const, label: "原文", icon: FileText },
  { id: "translation" as const, label: "翻译", icon: Languages },
  { id: "analysis" as const, label: "分段分析", icon: ScrollText },
  { id: "graph" as const, label: "图谱", icon: Network },
  { id: "creative" as const, label: "创意输出", icon: Lightbulb }
];

export function WorkspaceSidebar({ activeTab, onChange }: { activeTab: WorkspaceTab; onChange: (tab: WorkspaceTab) => void }) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-950">功能导航</h2>
        <div className="mt-3 grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 thin-scrollbar">
        <h2 className="text-sm font-semibold text-slate-950">文档大纲</h2>
        <div className="mt-3 space-y-2">
          {mockDocumentOutline.map((item, index) => (
            <button key={item} className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:border-blue-200 hover:bg-blue-50">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-600 ring-1 ring-slate-200">{index + 1}</span>
              {item}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
