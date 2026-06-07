"use client";

import { Download, Loader2, PackageOpen, Play, Settings, Upload, X } from "lucide-react";
import { useState } from "react";
import { documentKindConfidenceLabel, documentKindLabel } from "@/lib/documentKindDetector";
import type { DocumentKindDetection } from "@/lib/documentTypes";
import type { ExportPresetPlan, PptxCoverStyle, PptxExportOptions, PptxThemeName } from "@/lib/exporters/exportTypes";
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
  documentKind,
  onAnalyze,
  onExport,
  onExportPreset,
  presetPlans = [],
  presetMessage = "",
  exportingPresetId = null,
  analyzing = false,
  exporting = false,
  isDemo = true,
  hasAnalysis = false,
  analysisFailed = false
}: {
  title?: string;
  status?: string;
  documentKind?: DocumentKindDetection;
  onAnalyze?: (mode: AnalyzeMode) => void;
  onExport?: (format: ExportFormat, only?: "chat", pptxOptions?: PptxExportOptions) => void;
  onExportPreset?: (preset: ExportPresetPlan) => void;
  presetPlans?: ExportPresetPlan[];
  presetMessage?: string;
  exportingPresetId?: string | null;
  analyzing?: boolean;
  exporting?: boolean;
  isDemo?: boolean;
  hasAnalysis?: boolean;
  analysisFailed?: boolean;
}) {
  const [apiOpen, setApiOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pptxOpen, setPptxOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
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
          <p className="mt-1 text-sm text-slate-500">
            AI document reading workspace
            {documentKind && (
              <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {documentKindLabel(documentKind.kind)} · {documentKindConfidenceLabel(documentKind.confidence)}
              </span>
            )}
          </p>
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
          <button
            onClick={() => setPresetOpen(true)}
            disabled={exporting || Boolean(exportingPresetId)}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <PackageOpen size={16} />
            导出预设
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
      {presetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <DialogHeader title="导出预设" description="选择一个用途，DocuMuse 会打包下载一个 ZIP。" onClose={() => setPresetOpen(false)} />
            {isDemo ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Demo 文档暂不支持预设导出，请打开真实文档后使用。</div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  {presetPlans.map((preset) => (
                    <div key={preset.presetId} className="rounded-xl border border-slate-200 p-4">
                      <h3 className="font-semibold text-slate-950">{preset.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{preset.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {preset.files.map((file) => (
                          <span key={`${preset.presetId}-${file.filename}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {labelForFileFormat(file.format)}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => onExportPreset?.(preset)}
                        disabled={Boolean(exportingPresetId)}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {exportingPresetId === preset.presetId && <Loader2 className="animate-spin" size={16} />}
                        {exportingPresetId === preset.presetId ? "正在下载..." : "下载 ZIP"}
                      </button>
                    </div>
                  ))}
                </div>
                {presetMessage && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{presetMessage}</div>}
              </>
            )}
          </div>
        </div>
      )}
      {pptxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <DialogHeader title="导出 PPTX" description="选择主题、封面和要导出的内容。" onClose={() => setPptxOpen(false)} />
            <div className="space-y-5">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">主题色</h3>
                <div className="grid grid-cols-4 gap-2">
                  {THEME_OPTIONS.map((item) => (
                    <button key={item.value} onClick={() => updatePptxOption("theme", item.value)} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${pptxOptions.theme === item.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
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
                    <button key={item.value} onClick={() => updatePptxOption("cover", item.value)} className={`rounded-lg border p-3 text-left ${pptxOptions.cover === item.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
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
                      <input type="checkbox" checked={Boolean(pptxOptions[item.key])} onChange={(event) => updatePptxOption(item.key, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
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

function DialogHeader({ title, description, onClose }: { title: string; description: string; onClose: () => void }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
        <X size={18} />
      </button>
    </div>
  );
}

function labelForFileFormat(format: string) {
  if (format === "markdown") return "Markdown";
  if (format === "chat-markdown") return "问答 Markdown";
  if (format === "json") return "JSON";
  if (format === "pptx") return "PPTX";
  return format;
}
