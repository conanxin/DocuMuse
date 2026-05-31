"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { mockDocuments } from "@/lib/mockData";
import type { DocumentListItem } from "@/lib/documentTypes";
import { StatusBadge } from "./StatusBadge";

type DocumentsResponse = {
  ok: boolean;
  documents?: DocumentListItem[];
  error?: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  throw new Error("接口返回了非 JSON 响应。");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function RecentDocuments() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDocuments = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      const payload = await parseJsonResponse<DocumentsResponse>(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "读取本地文档列表失败。");
      }
      setDocuments(payload.documents ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取本地文档列表失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  const deleteDocument = async (event: React.MouseEvent<HTMLButtonElement>, document: DocumentListItem) => {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm("确定要删除这个本地文档吗？此操作会删除解析 JSON 和上传的 PDF 文件。");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
      const payload = await parseJsonResponse<{ ok: boolean; error?: string }>(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "删除本地文档失败。");
      }
      await loadDocuments();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除本地文档失败。");
    }
  };

  const hasRealDocuments = documents.length > 0;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-950">最近文档</h2>
        <span className="text-xs text-slate-500">{loading ? "加载中" : hasRealDocuments ? `${documents.length} 个本地文档` : "示例文档"}</span>
      </div>

      {error && <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">{error}</div>}

      <div className="space-y-3">
        {hasRealDocuments
          ? documents.slice(0, 8).map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`} className="block rounded-xl border border-slate-100 p-3 hover:border-blue-200 hover:bg-blue-50/40">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-slate-900">{doc.title}</div>
                      <button
                        aria-label="删除本地文档"
                        onClick={(event) => void deleteDocument(event, doc)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{doc.fileType.toUpperCase()}</span>
                      <span>{formatDate(doc.createdAt)}</span>
                      <span>{doc.pageCount} 页</span>
                      <span>{doc.textLength.toLocaleString()} 字符</span>
                    </div>
                    <div className="mt-2">
                      <StatusBadge status="已解析" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          : mockDocuments.map((doc) => (
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
