import type { CreativeStatus, DocumentStatus } from "@/lib/mockData";

type Status = DocumentStatus | CreativeStatus | "已解析" | "上传中" | "正在提取" | "正在分析";

const statusClass: Record<string, string> = {
  已解析: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  解析中: "bg-blue-50 text-blue-700 ring-blue-200",
  失败: "bg-rose-50 text-rose-700 ring-rose-200",
  未生成: "bg-slate-50 text-slate-600 ring-slate-200",
  生成中: "bg-blue-50 text-blue-700 ring-blue-200",
  已生成: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  生成失败: "bg-rose-50 text-rose-700 ring-rose-200",
  上传中: "bg-blue-50 text-blue-700 ring-blue-200",
  正在提取: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  正在分析: "bg-cyan-50 text-cyan-700 ring-cyan-200"
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status] ?? statusClass["未生成"]}`}>
      {status}
    </span>
  );
}
