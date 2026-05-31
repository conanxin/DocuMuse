"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2, RefreshCw } from "lucide-react";

type UploadState = "empty" | "dragging" | "uploading" | "extracting" | "analyzing" | "done" | "error";

const stateCopy: Record<UploadState, { title: string; subtitle: string }> = {
  empty: {
    title: "拖入 PDF 文档",
    subtitle: "上传后将在本地保存 PDF、提取文本，并生成可交互的文档工作台。"
  },
  dragging: {
    title: "松开即可开始上传",
    subtitle: "DocuMuse 会在本地解析 PDF，不会上传到外部服务。"
  },
  uploading: {
    title: "正在上传文档",
    subtitle: "正在把 PDF 发送到本地解析接口。"
  },
  extracting: {
    title: "正在提取文本",
    subtitle: "正在读取 PDF 文本内容，请稍等。"
  },
  analyzing: {
    title: "正在生成工作台",
    subtitle: "正在根据提取文本生成占位摘要、观点和分段信息。"
  },
  done: {
    title: "工作台已生成",
    subtitle: "即将进入真实文档工作台。"
  },
  error: {
    title: "解析失败",
    subtitle: "请确认上传的是可解析的 PDF 文件。"
  }
};

type UploadResponse = {
  ok: boolean;
  documentId?: string;
  redirectUrl?: string;
  error?: string;
};

async function parseUploadResponse(response: Response): Promise<UploadResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as UploadResponse;
  }

  const text = await response.text();
  return {
    ok: false,
    error: text ? `上传接口返回了非 JSON 响应：${text.slice(0, 120)}` : "上传接口返回了非 JSON 响应。"
  };
}

export function UploadDropzone() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("empty");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = state === "uploading" || state === "extracting" || state === "analyzing";
  const done = state === "done";
  const hasError = state === "error";

  const uploadFile = async (file?: File | null) => {
    if (!file) {
      setErrorMessage("未选择文件。");
      setState("error");
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("仅支持上传 PDF 文件。");
      setState("error");
      return;
    }

    setLastFile(file);
    setErrorMessage("");
    setState("uploading");
    setProgress(18);

    const extractionTimer = window.setTimeout(() => {
      setState("extracting");
      setProgress(56);
    }, 450);
    const analysisTimer = window.setTimeout(() => {
      setState("analyzing");
      setProgress(82);
    }, 1100);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData
      });
      const payload = await parseUploadResponse(response);

      if (!response.ok || !payload.ok || !payload.redirectUrl) {
        throw new Error(payload.error || "上传失败，请稍后重试。");
      }

      setState("done");
      setProgress(100);
      window.setTimeout(() => router.push(payload.redirectUrl!), 450);
    } catch (error) {
      setState("error");
      setProgress(0);
      setErrorMessage(error instanceof Error ? error.message : "前端请求失败，请稍后重试。");
    } finally {
      window.clearTimeout(extractionTimer);
      window.clearTimeout(analysisTimer);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const active = state === "dragging";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setState("dragging");
        }}
        onDragLeave={() => {
          if (!busy) setState("empty");
        }}
        onDrop={(event) => {
          event.preventDefault();
          void uploadFile(event.dataTransfer.files.item(0));
        }}
        className={`flex min-h-[390px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          active ? "border-blue-500 bg-blue-50" : hasError ? "border-rose-200 bg-rose-50" : done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => void uploadFile(event.target.files?.item(0))}
        />
        <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${done ? "bg-emerald-100 text-emerald-700" : hasError ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
          {busy ? <Loader2 className="animate-spin" size={28} /> : done ? <CheckCircle2 size={28} /> : hasError ? <AlertCircle size={28} /> : <FileUp size={28} />}
        </div>
        <h1 className="text-2xl font-bold text-slate-950">{stateCopy[state].title}</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{hasError && errorMessage ? errorMessage : stateCopy[state].subtitle}</p>

        {(busy || done) && (
          <div className="mt-7 w-full max-w-md">
            <div className="mb-2 flex justify-between text-xs font-medium text-slate-500">
              <span>{busy ? "处理中" : "完成"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
              <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {!done && !hasError && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              选择文件
            </button>
          )}
          {hasError && (
            <>
              <button onClick={() => void uploadFile(lastFile)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                <RefreshCw size={16} />
                重试
              </button>
              <button onClick={() => inputRef.current?.click()} className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                重新选择
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
