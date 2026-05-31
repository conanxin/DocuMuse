"use client";

import { Download, Play, RefreshCw, Settings } from "lucide-react";
import { useState } from "react";
import { ApiSettingsDialog } from "../ApiSettingsDialog";
import { StatusBadge } from "../StatusBadge";

export function WorkspaceTopbar({ title = "demo-interview.pdf" }: { title?: string }) {
  const [apiOpen, setApiOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-950">{title}</h1>
            <StatusBadge status="已解析" />
          </div>
          <p className="mt-1 text-sm text-slate-500">AI 文档阅读工作台 Demo</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Play size={16} />
            开始分析
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw size={16} />
            重新生成
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download size={16} />
            导出 Markdown
          </button>
          <button onClick={() => setApiOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Settings size={16} />
            API 设置
          </button>
        </div>
      </div>
      <ApiSettingsDialog open={apiOpen} onClose={() => setApiOpen(false)} />
    </>
  );
}
