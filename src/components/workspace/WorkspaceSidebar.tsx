"use client";

import { BarChart3, Eye, EyeOff, FileSearch, FileText, Languages, Lightbulb, Network, RotateCcw, Save, ScrollText, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ensureDocumentStructure } from "@/lib/documentStructure";
import type { ChatSource, DocumentOutlineNode, EditableOutlineNode, ParsedDocument, ParsedSection } from "@/lib/documentTypes";
import { flattenOutline } from "@/lib/outlineExtractor";
import { createEditableOutlineFromAuto, getEffectiveOutline, getOutlineMode } from "@/lib/outlineUtils";
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

const outlineTypeOptions: NonNullable<DocumentOutlineNode["type"]>[] = ["abstract", "introduction", "section", "subsection", "conclusion", "references", "appendix", "unknown"];

export function WorkspaceSidebar({
  activeTab,
  onChange,
  document,
  onSectionClick,
  onOutlineChanged,
  isDemo = false
}: {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  document?: ParsedDocument | null;
  onSectionClick?: (source: ChatSource) => void;
  onOutlineChanged?: () => Promise<void> | void;
  isDemo?: boolean;
}) {
  const structured = document ? ensureDocumentStructure(document) : null;
  const outlineNodes = structured ? flattenOutline(getEffectiveOutline(structured)) : [];
  const sections = structured?.sections ?? [];
  const outlineMode = structured ? getOutlineMode(structured) : "auto";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableOutlineNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!editing || !structured) return;
    setDraft(createDraftOutline(structured));
  }, [editing, structured]);

  const saveDraft = async () => {
    if (!document || isDemo) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/documents/${document.id}/outline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "custom", customOutline: normalizeDraftIndexes(draft) })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "保存自定义大纲失败。");
      setEditing(false);
      setMessage("自定义大纲已保存。");
      await onOutlineChanged?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存自定义大纲失败。");
    } finally {
      setSaving(false);
    }
  };

  const resetOutline = async () => {
    if (!document || isDemo) return;
    if (!window.confirm("确定要重置为自动识别大纲吗？自定义修改会被清除。")) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/documents/${document.id}/outline/reset`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "重置大纲失败。");
      setEditing(false);
      setMessage("已重置为自动识别大纲。");
      await onOutlineChanged?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重置大纲失败。");
    } finally {
      setSaving(false);
    }
  };

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
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">文档大纲</h2>
            <p className="mt-1 text-[11px] text-slate-400">{outlineMode === "custom" ? "自定义大纲" : "自动识别大纲"}</p>
          </div>
          {document && !editing && (
            <button
              onClick={() => {
                setDraft(structured ? createDraftOutline(structured) : []);
                setEditing(true);
                setMessage("");
              }}
              disabled={isDemo}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              编辑大纲
            </button>
          )}
        </div>
        {outlineMode === "custom" && !editing && <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">当前使用自定义大纲。你可以重置为自动识别结果。</p>}
        {outlineMode === "auto" && !editing && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">如果大纲有误，可进入编辑模式隐藏误检标题或补充漏检标题。</p>}
        {message && <p className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">{message}</p>}

        {editing ? (
          <OutlineEditor draft={draft} saving={saving} onChange={setDraft} onSave={saveDraft} onCancel={() => setEditing(false)} onReset={resetOutline} />
        ) : (
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
        )}
      </div>
    </aside>
  );
}

function OutlineEditor({
  draft,
  saving,
  onChange,
  onSave,
  onCancel,
  onReset
}: {
  draft: EditableOutlineNode[];
  saving: boolean;
  onChange: (nodes: EditableOutlineNode[]) => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  const updateNode = (id: string, patch: Partial<EditableOutlineNode>) => {
    onChange(draft.map((node) => (node.id === id ? { ...node, ...patch, userEdited: true, updatedAt: new Date().toISOString() } : node)));
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          <Save size={13} />
          保存
        </button>
        <button onClick={onCancel} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60">
          <X size={13} />
          取消
        </button>
        <button onClick={onReset} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60">
          <RotateCcw size={13} />
          重置
        </button>
      </div>
      <div className="space-y-2">
        {draft.slice(0, 120).map((node) => (
          <div key={node.id} className={`rounded-xl border p-3 ${node.hidden ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start gap-2">
              <button type="button" onClick={() => updateNode(node.id, { hidden: !node.hidden })} className="mt-1 rounded-lg border border-slate-200 p-1 text-slate-500 hover:text-blue-700" title={node.hidden ? "恢复" : "隐藏"}>
                {node.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <div className="min-w-0 flex-1 space-y-2">
                <input value={node.title} onChange={(event) => updateNode(node.id, { title: event.target.value })} className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700" maxLength={180} />
                <div className="grid grid-cols-2 gap-2">
                  <select value={node.level} onChange={(event) => updateNode(node.id, { level: Number(event.target.value) })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                    <option value={1}>Level 1</option>
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                  </select>
                  <select value={node.type ?? "unknown"} onChange={(event) => updateNode(node.id, { type: event.target.value as EditableOutlineNode["type"] })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                    {outlineTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {outlineTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-400">{node.manual ? "手动添加" : node.originalTitle && node.originalTitle !== node.title ? `原标题：${node.originalTitle}` : "自动识别"}</p>
              </div>
            </div>
          </div>
        ))}
        {!draft.length && <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">暂无可编辑大纲。</p>}
      </div>
    </div>
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
  if (type === "title") return "标题";
  if (type === "abstract") return "摘要";
  if (type === "introduction") return "引言";
  if (type === "conclusion") return "结论";
  if (type === "references") return "参考文献";
  if (type === "appendix") return "附录";
  if (type === "subsection") return "小节";
  if (type === "unknown") return "未知";
  return "章节";
}

function createDraftOutline(document: ParsedDocument): EditableOutlineNode[] {
  const source = document.outlineEditState?.mode === "custom" && document.outlineEditState.customOutline?.length ? document.outlineEditState.customOutline : createEditableOutlineFromAuto(document.outline ?? []);
  return flattenOutline(source).map((node, index) => ({
    ...node,
    id: node.id || `custom-outline-${index + 1}`,
    index: index + 1,
    level: Math.min(3, Math.max(1, node.level || 1)),
    type: node.type ?? (node.level > 1 ? "subsection" : "section"),
    confidence: node.confidence ?? "low",
    originalTitle: "originalTitle" in node && typeof node.originalTitle === "string" ? node.originalTitle : node.title,
    children: undefined
  })) as EditableOutlineNode[];
}

function normalizeDraftIndexes(nodes: EditableOutlineNode[]) {
  return nodes.map((node, index) => ({
    ...node,
    index: index + 1,
    children: undefined
  }));
}
