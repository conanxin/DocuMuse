import { BarChart3, FileSearch, FileText, Languages, Lightbulb, Network, ScrollText } from "lucide-react";
import { ensureDocumentStructure } from "@/lib/documentStructure";
import type { ChatSource, DocumentOutlineNode, ParsedDocument, ParsedSection } from "@/lib/documentTypes";
import { flattenOutline } from "@/lib/outlineExtractor";
import { mockDocumentOutline } from "@/lib/mockData";

export type WorkspaceTab = "overview" | "original" | "pdf" | "translation" | "analysis" | "graph" | "creative";

const navItems = [
  { id: "overview" as const, label: "总览", icon: BarChart3 },
  { id: "original" as const, label: "原文", icon: FileText },
  { id: "pdf" as const, label: "PDF 预览", icon: FileSearch },
  { id: "translation" as const, label: "翻译", icon: Languages },
  { id: "analysis" as const, label: "分段分析", icon: ScrollText },
  { id: "graph" as const, label: "图谱", icon: Network },
  { id: "creative" as const, label: "创意输出", icon: Lightbulb }
];

export function WorkspaceSidebar({
  activeTab,
  onChange,
  document,
  onSectionClick
}: {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  document?: ParsedDocument | null;
  onSectionClick?: (source: ChatSource) => void;
}) {
  const structured = document ? ensureDocumentStructure(document) : null;
  const outlineNodes = structured?.outline?.length ? flattenOutline(structured.outline) : [];
  const sections = structured?.sections ?? [];

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
          {outlineNodes.length
            ? outlineNodes.slice(0, 80).map((node) => <OutlineButton key={node.id} node={node} onSectionClick={onSectionClick} />)
            : sections.length
              ? sections.slice(0, 24).map((section) => <SectionButton key={section.id} section={section} onSectionClick={onSectionClick} />)
              : mockDocumentOutline.map((item, index) => (
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

function OutlineButton({ node, onSectionClick }: { node: DocumentOutlineNode; onSectionClick?: (source: ChatSource) => void }) {
  const indent = Math.min(Math.max(node.level - 1, 0), 4) * 14;
  const paragraphId = node.startParagraphId;
  const startChar = node.startChar ?? 0;
  return (
    <button
      className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:border-blue-200 hover:bg-blue-50"
      style={{ paddingLeft: 12 + indent }}
      onClick={() =>
        onSectionClick?.({
          paragraphId,
          anchorId: paragraphId ? paragraphId.replace(/^para-/, "p-") : undefined,
          outlineNodeId: node.id,
          outlineTitle: node.title,
          outlineType: node.type,
          pageNumber: node.pageNumber,
          sourceHint: node.pageNumber ? `第 ${node.pageNumber} 页 · ${node.title}` : node.title,
          quote: node.title,
          startChar,
          endChar: node.endChar ?? startChar + node.title.length
        })
      }
    >
      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-600 ring-1 ring-slate-200">{node.index}</span>
      <span className="align-middle">{node.title}</span>
      <span className="mt-1 flex flex-wrap gap-1 pl-7 text-[11px] text-slate-400">
        <span>Level {node.level}</span>
        <span>{outlineTypeLabel(node.type)}</span>
        {node.pageNumber && <span>第 {node.pageNumber} 页</span>}
      </span>
    </button>
  );
}

function SectionButton({ section, onSectionClick }: { section: ParsedSection; onSectionClick?: (source: ChatSource) => void }) {
  return (
    <button
      className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:border-blue-200 hover:bg-blue-50"
      onClick={() =>
        onSectionClick?.({
          paragraphId: section.startParagraphId,
          anchorId: section.startParagraphId.replace(/^para-/, "p-"),
          sectionId: section.id,
          sectionTitle: section.title,
          pageNumber: section.pageNumber,
          sourceHint: section.pageNumber ? `第 ${section.pageNumber} 页 · ${section.title}` : section.title,
          quote: section.title,
          startChar: section.startChar,
          endChar: section.endChar ?? section.startChar + section.title.length
        })
      }
    >
      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-600 ring-1 ring-slate-200">{section.index}</span>
      <span className="align-middle">{section.title}</span>
      {section.pageNumber && <span className="mt-1 block pl-7 text-xs text-slate-400">第 {section.pageNumber} 页</span>}
    </button>
  );
}

function outlineTypeLabel(type?: DocumentOutlineNode["type"]) {
  if (type === "abstract") return "摘要";
  if (type === "introduction") return "引言";
  if (type === "conclusion") return "结论";
  if (type === "references") return "参考文献";
  if (type === "appendix") return "附录";
  return "章节";
}
