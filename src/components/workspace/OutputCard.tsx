"use client";

import { Copy, Eye, RefreshCw, Share } from "lucide-react";
import type { CreativeStatus } from "@/lib/mockData";
import { StatusBadge } from "../StatusBadge";

export function OutputCard({
  title,
  status,
  preview,
  onRegenerate
}: {
  title: string;
  status: CreativeStatus;
  preview: string;
  onRegenerate: () => void;
}) {
  const loading = status === "生成中";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{preview}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Eye size={15} />
          查看
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Copy size={15} />
          复制
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Share size={15} />
          导出
        </button>
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          重新生成
        </button>
      </div>
    </article>
  );
}
