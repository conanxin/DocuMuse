"use client";

import { Download, Loader2, Play, Settings, Upload, X } from "lucide-react";
import { useState } from "react";
import type { PptxCoverStyle, PptxExportOptions, PptxThemeName } from "@/lib/exporters/exportTypes";
import { ApiSettingsDialog } from "../ApiSettingsDialog";
import { DocumentUploadPanel } from "../DocumentUploadPanel";
import { StatusBadge } from "../StatusBadge";

type AnalyzeMode = "quick" | "full";
type ExportFormat = "markdown" | "json" | "pptx";

const DEFAULT_PPTX_OPTIONS: PptxExportOptions = {
  theme: "blue",
  cover: "report",
  includeSummary: true,
  includeKeyPoints: true,
  includeKeywords: true,
  includeSections: true,
  includeOutline: true,
  includeCreative: true,
  includeChat: true
};

const THEME_OPTIONS: Array<{ value: PptxThemeName; label: string; color: string }> = [
  { value: "blue", label: "蓝色", color: "bg-blue-600" },
  { value: "green", label: "绿色", color: "bg-emerald-600" },
  { value: "purple", label: "紫色", color: "bg-violet-600" },
  { value: "slate", label: "深灰", color: "bg-slate-700" }
];

const COVER_OPTIONS: Array<{ value: PptxCoverStyle; label: string; description: string }> = [
  { value: "report", label: "报告", description: "信息卡片与关键词预览" },
  { value: "standard", label: "标准", description: "左侧标题与右侧色块" },
  { value: "minimal", label: "极简", description: "少装饰、更大标题" }
];

const CONTENT_OPTIONS: Array<{ key: keyof Pick<PptxExportOptions, "includeSummary" | "includeKeyPoints" | "includeKeywords" | "includeSections" | "includeOutline" | "includeCreative" | "includeChat">; label: string }> = [
  { key: "includeSummary", label: "摘要" },
  { key: "includeKeyPoints", label: "核心观点" },
  { key: "includeKeywords", label: "关键词" },
  { key: "includeSections", label: "分段分析" },
  { key: "includeOutline", label: "PPT 大纲" },
  { key: "includeCreative", label: "创意输出" },
  { key: "includeChat", label: "文档问答" }
];

export function WorkspaceTopbar({
  title = "demo-interview.pdf",
  status = "已解析",
  onAnalyze,
  onExport,
  analyzing = false,
  exporting = false,
  isDemo = true,
  hasAnalysis = false,
  analysisFailed = false
}: {
  title?: string;
  status?: string;
  onAnalyze?: (mode: AnalyzeMode) => void;
  onExport?: (format: ExportFormat, only?: "chat", pptxOptions?: PptxExportOptions) => void;
  analyzing?: boolean;
  exporting?: boolean;
  isDemo?: boolean;
  hasAnalysis?: boolean;
  analysisFailed?: boolean;
}) {
  const [apiOpen, setApiOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pptxOpen, setPptxOpen] = useState(false);
  const [pptxOptions, setPptxOptions] = useState<PptxExportOptions>(DEFAULT_PPTX_OPTIONS);
  const quickLabel = hasAnalysis || analysisFailed ? "重新快速分析" : "快速分析";
  const fullLabel = hasAnalysis || analysisFailed ? "重新完整分析" : "完整分析";

  const updatePptxOption = <K extends keyof PptxExportOptions>(key: K, value: PptxExportOptions[K]) => {
    setPptxOptions((current) => ({ ...current, [key]: value }));
  };

  const exportPptx = () => {
    onExport?.("pptx", undefined, pptxOptions);
    setPptxOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-lg font-bold text-slate-950">{title}</h1>
            <StatusBadge status={status as never} />
          </div>
          <p className="mt-1 text-sm text-slate-500">AI document reading workspace</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload size={16} />
            上传新文档
          </button>
          <button
            onClick={() => onAnalyze?.("quick")}
            disabled={analyzing || isDemo}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {analyzing ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            {analyzing ? "分析中..." : quickLabel}
          </button>
          <button
            onClick={() => onAnalyze?.("full")}
            disabled={analyzing || isDemo}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {analyzing ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            {analyzing ? "分析中..." : fullLabel}
          </button>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => onExport?.("markdown")}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              导出 Markdown
            </button>
            <button onClick={() => onExport?.("json")} disabled={exporting} className="border-l border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70">
              JSON
            </button>
            <button onClick={() => setPptxOpen(true)} disabled={exporting} className="border-l border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70">
              PPTX
            </button>
            <button onClick={() => onExport?.("markdown", "chat")} disabled={exporting} className="border-l border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70">
              问答
            </button>
          </div>
          <button onClick={() => setApiOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Settings size={16} />
            API 设置
          </button>
        </div>
      </div>
      <ApiSettingsDialog open={apiOpen} onClose={() => setApiOpen(false)} />
      {pptxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">导出 PPTX</h2>
                <p className="mt-1 text-sm text-slate-500">选择主题、封面和要导出的内容。</p>
              </div>
              <button onClick={() => setPptxOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">主题色</h3>
                <div className="grid grid-cols-4 gap-2">
                  {THEME_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => updatePptxOption("theme", item.value)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${pptxOptions.theme === item.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                    >
                      <span className={`h-3 w-3 rounded-full ${item.color}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">封面风格</h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  {COVER_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => updatePptxOption("cover", item.value)}
                      className={`rounded-lg border p-3 text-left ${pptxOptions.cover === item.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                    >
                      <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.description}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">导出内容</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CONTENT_OPTIONS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(pptxOptions[item.key])}
                        onChange={(event) => updatePptxOption(item.key, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPptxOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                取消
              </button>
              <button onClick={exportPptx} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                {exporting && <Loader2 className="animate-spin" size={16} />}
                导出 PPTX
              </button>
            </div>
          </div>
        </div>
      )}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">上传新文档</h2>
                <p className="mt-1 text-sm text-slate-500">上传成功后会自动进入新的文档工作台。</p>
              </div>
              <button onClick={() => setUploadOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                关闭
              </button>
            </div>
            <DocumentUploadPanel compact onSuccess={(redirectUrl) => (window.location.href = redirectUrl)} />
          </div>
        </div>
      )}
    </>
  );
}
