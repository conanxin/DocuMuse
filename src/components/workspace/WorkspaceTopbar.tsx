"use client";

import { Download, Loader2, Play, Settings, Upload } from "lucide-react";
import { useState } from "react";
import { ApiSettingsDialog } from "../ApiSettingsDialog";
import { DocumentUploadPanel } from "../DocumentUploadPanel";
import { StatusBadge } from "../StatusBadge";

type AnalyzeMode = "quick" | "full";
type ExportFormat = "markdown" | "json" | "pptx";

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
  onExport?: (format: ExportFormat, only?: "chat") => void;
  analyzing?: boolean;
  exporting?: boolean;
  isDemo?: boolean;
  hasAnalysis?: boolean;
  analysisFailed?: boolean;
}) {
  const [apiOpen, setApiOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const quickLabel = hasAnalysis || analysisFailed ? "重新快速分析" : "快速分析";
  const fullLabel = hasAnalysis || analysisFailed ? "重新完整分析" : "完整分析";

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
            <button
              onClick={() => onExport?.("json")}
              disabled={exporting}
              className="border-l border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              JSON
            </button>
            <button
              onClick={() => onExport?.("pptx")}
              disabled={exporting}
              className="border-l border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              PPTX
            </button>
            <button
              onClick={() => onExport?.("markdown", "chat")}
              disabled={exporting}
              className="border-l border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
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
