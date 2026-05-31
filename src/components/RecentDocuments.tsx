import { FileText } from "lucide-react";
import { mockDocuments } from "@/lib/mockData";
import { StatusBadge } from "./StatusBadge";

export function RecentDocuments() {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-950">最近文档</h2>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700">查看全部</button>
      </div>
      <div className="space-y-3">
        {mockDocuments.map((doc) => (
          <div key={doc.id} className="rounded-xl border border-slate-100 p-3 hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{doc.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{doc.type}</span>
                  <span>{doc.uploadedAt}</span>
                </div>
                <div className="mt-2">
                  <StatusBadge status={doc.status} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
