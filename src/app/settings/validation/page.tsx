"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Play, RefreshCw, XCircle } from "lucide-react";

type LlmConfig = {
  provider: string;
  hasApiKey: boolean;
  maskedApiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  source: "ui" | "env" | "default";
};

type DocumentItem = {
  id: string;
  title: string;
  filename: string;
  createdAt: string;
  pageCount: number;
  textLength: number;
};

type TestResult = {
  status: "idle" | "running" | "success" | "failed";
  message?: string;
  elapsedMs?: number;
  provider?: string;
  model?: string;
  documentId?: string;
  details?: string;
};

const initialResult: TestResult = { status: "idle" };

export default function ValidationPage() {
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Record<string, TestResult>>({
    connection: initialResult,
    quick: initialResult,
    full: initialResult,
    chat: initialResult
  });

  const selectedDocument = useMemo(() => documents.find((document) => document.id === selectedId), [documents, selectedId]);

  const load = async () => {
    setLoading(true);
    try {
      const [settingsResponse, documentsResponse] = await Promise.all([
        fetch("/api/settings/llm", { cache: "no-store" }),
        fetch("/api/documents", { cache: "no-store" })
      ]);
      const settingsPayload = await settingsResponse.json();
      const documentsPayload = await documentsResponse.json();
      if (settingsPayload.ok) setConfig(settingsPayload.config);
      if (documentsPayload.ok) {
        setDocuments(documentsPayload.documents ?? []);
        setSelectedId((current) => current || documentsPayload.documents?.[0]?.id || "");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateResult = (key: string, value: TestResult) => {
    setResults((current) => ({ ...current, [key]: value }));
  };

  const runTimed = async (key: string, operation: () => Promise<TestResult>) => {
    updateResult(key, { status: "running" });
    const started = performance.now();
    try {
      const result = await operation();
      updateResult(key, { ...result, elapsedMs: Math.round(performance.now() - started) });
    } catch (error) {
      updateResult(key, {
        status: "failed",
        message: error instanceof Error ? error.message : "测试失败。",
        elapsedMs: Math.round(performance.now() - started)
      });
    }
  };

  const testConnection = () =>
    runTimed("connection", async () => {
      const response = await fetch("/api/llm/test", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "连接测试失败。");
      return {
        status: "success",
        message: payload.message || "连接成功",
        provider: payload.provider || config?.provider,
        model: payload.model || config?.model
      };
    });

  const runAnalysis = (mode: "quick" | "full") =>
    runTimed(mode, async () => {
      if (!selectedId) throw new Error("请先选择一个本地文档。");
      const response = await fetch(`/api/documents/${selectedId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || `${mode} 分析失败。`);
      return {
        status: "success",
        message: mode === "quick" ? "快速分析完成" : "完整分析完成",
        provider: payload.analysisProvider,
        model: payload.analysisModel,
        documentId: selectedId,
        details: `analysis=${payload.analysisStatus || "completed"}, sources=${payload.analysisDiagnostics?.parserStrategy || "n/a"}`
      };
    });

  const testChat = () =>
    runTimed("chat", async () => {
      if (!selectedId) throw new Error("请先选择一个本地文档。");
      const response = await fetch(`/api/documents/${selectedId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "这篇文章讲了什么？" })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "文档问答失败。");
      return {
        status: "success",
        message: "文档问答完成",
        documentId: selectedId,
        details: `answer=${Boolean(payload.answer)}, sources=${payload.sources?.length ?? 0}`
      };
    });

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">DocuMuse 验收测试</h1>
            <p className="mt-2 text-sm text-slate-500">本页用于本地真实模型验收，不显示完整 API Key、原文或 prompt。</p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw size={16} />
            刷新状态
          </button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">当前 LLM 配置</h2>
            {loading && <p className="mt-3 text-sm text-slate-500">正在读取配置...</p>}
            {config && (
              <dl className="mt-4 grid gap-3 text-sm">
                <Info label="Provider" value={config.provider} />
                <Info label="Model" value={config.model} />
                <Info label="Base URL" value={config.baseUrl} />
                <Info label="API Key" value={config.hasApiKey ? config.maskedApiKey : "未设置"} />
                <Info label="Source" value={config.source} />
              </dl>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">选择本地文档</h2>
            {documents.length ? (
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title} · {document.textLength.toLocaleString()} 字符
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">暂无本地文档，请先上传 PDF。</p>
            )}
            {selectedDocument && <p className="mt-3 text-sm text-slate-500">当前文档：{selectedDocument.id}</p>}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ValidationCard title="测试连接" result={results.connection} onRun={testConnection} />
          <ValidationCard title="测试 quick 分析" result={results.quick} onRun={() => runAnalysis("quick")} disabled={!selectedId} />
          <ValidationCard title="测试 full 分析" result={results.full} onRun={() => runAnalysis("full")} disabled={!selectedId} />
          <ValidationCard title="测试文档问答" result={results.chat} onRun={testChat} disabled={!selectedId} />
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function ValidationCard({ title, result, onRun, disabled }: { title: string; result: TestResult; onRun: () => void; disabled?: boolean }) {
  const running = result.status === "running";
  const success = result.status === "success";
  const failed = result.status === "failed";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-950">{title}</h3>
        {running ? <Loader2 className="animate-spin text-blue-600" size={18} /> : success ? <CheckCircle2 className="text-emerald-600" size={18} /> : failed ? <XCircle className="text-rose-600" size={18} /> : null}
      </div>
      <button onClick={onRun} disabled={running || disabled} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
        <Play size={15} />
        运行
      </button>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>状态：{result.status}</p>
        {result.message && <p>结果：{result.message}</p>}
        {result.elapsedMs !== undefined && <p>耗时：{result.elapsedMs} ms</p>}
        {result.provider && <p>Provider：{result.provider}</p>}
        {result.model && <p>Model：{result.model}</p>}
        {result.documentId && <p>文档：{result.documentId}</p>}
        {result.details && <p>细节：{result.details}</p>}
      </div>
    </article>
  );
}
