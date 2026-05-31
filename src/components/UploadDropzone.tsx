"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2, RefreshCw } from "lucide-react";

type UploadState = "empty" | "dragging" | "uploading" | "extracting" | "analyzing" | "done" | "error";

const stateCopy: Record<UploadState, { title: string; subtitle: string }> = {
  empty: {
    title: "拖入 PDF / EPUB / 文档",
    subtitle: "上传后自动解析、翻译、摘要、问答与多模态生成"
  },
  dragging: {
    title: "松开即可开始上传",
    subtitle: "DocuMuse 会为你生成一个可交互的文档工作台"
  },
  uploading: {
    title: "正在上传文档",
    subtitle: "Demo 使用模拟进度，不会把文件上传到云端"
  },
  extracting: {
    title: "正在提取文本",
    subtitle: "模拟解析 PDF、EPUB 和文档中的正文结构"
  },
  analyzing: {
    title: "正在生成工作台",
    subtitle: "准备摘要、翻译、分段分析、图谱和问答视图"
  },
  done: {
    title: "工作台已生成",
    subtitle: "demo-interview.pdf 已准备好，可以进入文档工作台"
  },
  error: {
    title: "解析失败",
    subtitle: "模拟错误：文档页数过多或文件格式暂不支持"
  }
};

export function UploadDropzone() {
  const [state, setState] = useState<UploadState>("empty");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const simulateUpload = () => {
    setState("uploading");
    setProgress(12);
    const timers = [
      window.setTimeout(() => setProgress(42), 450),
      window.setTimeout(() => {
        setState("extracting");
        setProgress(66);
      }, 1000),
      window.setTimeout(() => {
        setState("analyzing");
        setProgress(86);
      }, 1600),
      window.setTimeout(() => {
        setState("done");
        setProgress(100);
      }, 2300)
    ];
    return () => timers.forEach(window.clearTimeout);
  };

  const active = state === "dragging";
  const busy = state === "uploading" || state === "extracting" || state === "analyzing";
  const error = state === "error";
  const done = state === "done";

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
          simulateUpload();
        }}
        className={`flex min-h-[390px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          active ? "border-blue-500 bg-blue-50" : error ? "border-rose-200 bg-rose-50" : done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={simulateUpload} />
        <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${done ? "bg-emerald-100 text-emerald-700" : error ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
          {busy ? <Loader2 className="animate-spin" size={28} /> : done ? <CheckCircle2 size={28} /> : error ? <AlertCircle size={28} /> : <FileUp size={28} />}
        </div>
        <h1 className="text-2xl font-bold text-slate-950">{stateCopy[state].title}</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{stateCopy[state].subtitle}</p>

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
          {!done && !error && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              选择文件
            </button>
          )}
          {done && (
            <Link href="/documents/demo" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
              进入文档工作台
            </Link>
          )}
          {error && (
            <button onClick={simulateUpload} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
              <RefreshCw size={16} />
              重试
            </button>
          )}
          {!busy && !done && !error && (
            <button onClick={() => setState("error")} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-white">
              模拟失败
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
