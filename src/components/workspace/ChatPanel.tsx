"use client";

import type { FormEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, Loader2, Maximize2, Send, Trash2, X } from "lucide-react";
import { mockChatMessages } from "@/lib/mockData";
import type { ChatSource, DocumentChatMessage } from "@/lib/documentTypes";
import { ChatAnswerRenderer } from "./ChatAnswerRenderer";

const quickQuestions = ["这篇文章讲了什么？", "有哪些核心观点？", "有哪些值得引用的句子？", "帮我生成一篇中文总结"];

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt?: string;
  sources?: ChatSource[];
  loading?: boolean;
};

type ChatResponse = {
  ok: boolean;
  answer?: string;
  sources?: ChatSource[];
  error?: string;
  messages?: DocumentChatMessage[];
};

function mockMessages(): ChatMessage[] {
  const mapped = mockChatMessages.map((message, index) => ({
    id: `mock_${index}`,
    role: message.role,
    content: message.content,
    sources: message.source
      ? [
          {
            sourceHint: message.source,
            quote: message.source,
            startChar: 0,
            endChar: 120
          }
        ]
      : undefined
  }));

  return [
    ...mapped,
    {
      id: "mock_markdown_answer",
      role: "assistant",
      content: "### 直接回答\n\n这份 demo 展示了 **可追溯的文档问答**。\n\n### 关键依据\n\n- 回答会优先基于文档片段。\n- 来源会显示在回答下方，便于定位原文。\n\n### 可引用句子\n\n> every summary, quote, and generated output can be traced back to its source",
      sources: [{ sourceHint: "Demo source", quote: "every summary, quote, and generated output can be traced back to its source", startChar: 0, endChar: 120 }]
    }
  ];
}

async function safeJson(response: Response): Promise<ChatResponse> {
  try {
    return (await response.json()) as ChatResponse;
  } catch {
    return { ok: false, error: "服务返回了无法解析的响应。" };
  }
}

export function ChatPanel({
  documentId = "demo",
  documentTitle = "demo-interview.pdf",
  isPlaceholder = false,
  initialMessages = [],
  selectedSource,
  onSourceClick
}: {
  documentId?: string;
  documentTitle?: string;
  isPlaceholder?: boolean;
  initialMessages?: DocumentChatMessage[];
  selectedSource?: ChatSource | null;
  onSourceClick?: (source: ChatSource) => void;
}) {
  const isDemo = documentId === "demo";
  const [messages, setMessages] = useState<ChatMessage[]>(isDemo ? mockMessages() : initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [modalMessage, setModalMessage] = useState<ChatMessage | null>(null);

  useEffect(() => {
    if (isDemo) {
      setMessages(mockMessages());
      return;
    }
    setMessages(initialMessages);
  }, [isDemo, initialMessages]);

  const copyAnswer = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(""), 1200);
    } catch {
      setError("复制失败，请手动选择文本复制。");
    }
  };

  const send = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    if (isDemo) {
      setMessages((current) => [
        ...current,
        { id: `demo_user_${Date.now()}`, role: "user", content: trimmed },
        {
          id: `demo_assistant_${Date.now()}`,
          role: "assistant",
          content: "### 直接回答\n\n这是一个 **mock 回复**。我会先概括问题，再列出关键依据。\n\n### 关键依据\n\n- 来源引用会保留在回答下方。\n- 点击来源仍可切换到原文页。\n\n### 可引用句子\n\n> demo 引用来源",
          sources: [{ sourceHint: "第 2 页 / 第 3 段", quote: "demo 引用来源", startChar: 0, endChar: 120 }]
        }
      ]);
      setInput("");
      return;
    }

    const userMessage: ChatMessage = {
      id: `local_user_${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString()
    };
    const loadingMessage: ChatMessage = {
      id: `local_assistant_${Date.now()}`,
      role: "assistant",
      content: "正在查找相关段落并生成回答...",
      loading: true
    };

    setMessages((current) => [...current, userMessage, loadingMessage]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const response = await fetch(`/api/documents/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed })
      });
      const payload = await safeJson(response);
      if (!response.ok || !payload.ok || !payload.answer) {
        throw new Error(payload.error || "文档问答失败。");
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessage.id
            ? {
                id: `assistant_${Date.now()}`,
                role: "assistant",
                content: payload.answer!,
                sources: payload.sources ?? [],
                createdAt: new Date().toISOString()
              }
            : message
        )
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "文档问答失败。";
      setError(message);
      setMessages((current) => current.map((item) => (item.id === loadingMessage.id ? { ...item, content: message, loading: false } : item)));
    } finally {
      setSending(false);
    }
  };

  const clearMessages = async () => {
    if (!messages.length) return;
    if (!window.confirm("确定要清空这个文档的聊天记录吗？此操作不会删除文档和分析结果。")) return;

    if (isDemo) {
      setMessages([]);
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}/chat`, { method: "DELETE" });
      const payload = await safeJson(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || "清空聊天记录失败。");
      setMessages([]);
      setError("");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "清空聊天记录失败。");
    }
  };

  const exportMarkdown = () => {
    if (!messages.length) {
      setError("暂无聊天记录可导出。");
      return;
    }

    const markdown = buildChatMarkdown(documentTitle, messages);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `documuse-chat-${safeFilename(documentTitle)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-950">与文档对话</h2>
          <div className="flex gap-2">
            <button onClick={exportMarkdown} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Download size={14} />
              导出
            </button>
            <button onClick={() => void clearMessages()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Trash2 size={14} />
              清空
            </button>
          </div>
        </div>
        {isPlaceholder && <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">基于轻量段落检索生成回答，来源引用会显示在回答下方。</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickQuestions.map((question) => (
            <button key={question} onClick={() => void send(question)} disabled={sending} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {question}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{error}</p>}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4 thin-scrollbar">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            selectedSource={selectedSource}
            copied={copiedId === message.id}
            onCopy={() => void copyAnswer(message)}
            onOpen={() => setModalMessage(message)}
            onSourceClick={onSourceClick}
          />
        ))}
      </div>
      <form onSubmit={onSubmit} className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} disabled={sending} placeholder="向文档提问..." className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed" />
          <button aria-label="发送" disabled={sending || !input.trim()} className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          </button>
        </div>
      </form>
      {modalMessage && <ChatAnswerModal message={modalMessage} selectedSource={selectedSource} onCopy={() => void copyAnswer(modalMessage)} onClose={() => setModalMessage(null)} onSourceClick={onSourceClick} />}
    </aside>
  );
}

function MessageBubble({
  message,
  selectedSource,
  copied,
  onCopy,
  onOpen,
  onSourceClick
}: {
  message: ChatMessage;
  selectedSource?: ChatSource | null;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onSourceClick?: (source: ChatSource) => void;
}) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`rounded-2xl px-4 py-3 ${isAssistant ? "mr-2 border border-slate-200 bg-slate-50 text-slate-800 shadow-sm" : "ml-10 bg-blue-600 text-white"}`}>
      <div className="flex items-start gap-2">
        {message.loading && <Loader2 className="mt-1 shrink-0 animate-spin text-slate-500" size={14} />}
        {isAssistant && !message.loading ? <ChatAnswerRenderer content={message.content} /> : <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>}
      </div>
      {isAssistant && !message.loading && (
        <>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
            <button onClick={onCopy} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "已复制" : "复制回答"}
            </button>
            <button onClick={onOpen} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
              <Maximize2 size={13} />
              展开阅读
            </button>
          </div>
          <SourceList sources={message.sources ?? []} selectedSource={selectedSource} onSourceClick={onSourceClick} />
        </>
      )}
    </div>
  );
}

function SourceList({ sources, selectedSource, onSourceClick }: { sources: ChatSource[]; selectedSource?: ChatSource | null; onSourceClick?: (source: ChatSource) => void }) {
  if (!sources.length) {
    return <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">未找到明确来源。</p>;
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <p className="font-semibold text-slate-700">来源</p>
      <div className="mt-2 grid gap-2">
        {sources.slice(0, 5).map((source, index) => {
          const active = isSameSource(source, selectedSource);
          return (
            <div
              key={`${source.sourceHint}-${index}`}
              title={process.env.NODE_ENV === "development" ? `score=${source.score ?? "n/a"} terms=${source.matchedTerms?.join(", ") || "n/a"} reason=${source.retrievalReason || "n/a"}` : undefined}
              className={`rounded-lg border px-3 py-2 text-left transition ${active ? "border-blue-300 bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}`}
            >
              <button type="button" onClick={() => onSourceClick?.(source)} className="block w-full text-left">
                <span className="flex items-center gap-1 font-medium">
                  <ExternalLink size={12} />
                  {formatSourceLabel(source)}
                </span>
                {source.sectionTitle && <span className="mt-1 block text-[11px] text-slate-400">{source.sectionTitle}</span>}
                {source.isLowValue && <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">来源质量较低</span>}
                <span className="mt-1 block leading-5">{shortQuote(source.quote, 120)}</span>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] ${source.coordinateAvailable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{coordinateStatusLabel(source)}</span>
              </button>
              <CoordinateSourceDetails source={source} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function coordinateStatusLabel(source: ChatSource) {
  if (!source.coordinateAvailable) return "暂无页面坐标";
  if (source.coordinateConfidence === "low") return "页面区域近似定位";
  return "页面区域已定位";
}

function CoordinateSourceDetails({ source }: { source: ChatSource }) {
  if (!source.boundingBox) return null;
  const copyText = buildLocationText(source);
  const copyLocation = async (event: MouseEvent) => {
    event.stopPropagation();
    await navigator.clipboard?.writeText(copyText);
  };

  return (
    <details className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
      <summary className="cursor-pointer font-medium text-slate-600">坐标详情</summary>
      <div className="mt-2 grid gap-1">
        <span>pageNumber: {source.pageNumber ?? "未知"}</span>
        <span>confidence: {source.coordinateConfidence ?? "unknown"}</span>
        <span>
          x={formatCoordinateNumber(source.boundingBox.x)}, y={formatCoordinateNumber(source.boundingBox.y)}, width={formatCoordinateNumber(source.boundingBox.width)}, height={formatCoordinateNumber(source.boundingBox.height)}
        </span>
        <button type="button" onClick={copyLocation} className="mt-2 w-fit rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-600 hover:bg-slate-50">
          复制定位信息
        </button>
      </div>
    </details>
  );
}

function buildLocationText(source: ChatSource) {
  const box = source.boundingBox;
  const location = [source.pageNumber ? `第 ${source.pageNumber} 页` : "", source.sourceHint || source.paragraphId || ""].filter(Boolean).join(" · ");
  if (!box) return `${location || "来源位置"}\n暂无页面坐标\nconfidence=${source.coordinateConfidence ?? "unknown"}`;
  return `${location || "来源位置"}\n坐标：x=${formatCoordinateNumber(box.x)}, y=${formatCoordinateNumber(box.y)}, width=${formatCoordinateNumber(box.width)}, height=${formatCoordinateNumber(box.height)}\nconfidence=${source.coordinateConfidence ?? "unknown"}`;
}

function formatCoordinateNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function ChatAnswerModal({ message, selectedSource, onCopy, onClose, onSourceClick }: { message: ChatMessage; selectedSource?: ChatSource | null; onCopy: () => void; onClose: () => void; onSourceClick?: (source: ChatSource) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-950">回答详情</h3>
            <p className="mt-1 text-xs text-slate-500">完整 Markdown 渲染内容与来源引用</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCopy} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Copy size={14} />
              复制回答
            </button>
            <button onClick={onClose} aria-label="关闭" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-5 thin-scrollbar">
          <ChatAnswerRenderer content={message.content} expanded />
          <SourceList
            sources={message.sources ?? []}
            selectedSource={selectedSource}
            onSourceClick={(source) => {
              onSourceClick?.(source);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function isSameSource(source: ChatSource, selected?: ChatSource | null) {
  if (!selected) return false;
  if (source.paragraphId && selected.paragraphId) return source.paragraphId === selected.paragraphId;
  if (source.anchorId && selected.anchorId) return source.anchorId === selected.anchorId;
  return source.startChar === selected.startChar && source.endChar === selected.endChar && source.sourceHint === selected.sourceHint;
}

function formatSourceLabel(source: ChatSource) {
  if (source.pageNumber && source.sourceHint.includes("页")) return source.sourceHint;
  if (source.pageNumber) return `第 ${source.pageNumber} 页 · ${source.sourceHint}`;
  return source.sourceHint;
}

function buildChatMarkdown(documentTitle: string, messages: ChatMessage[]) {
  const lines = [`# 文档问答记录`, "", `文档：${documentTitle}`, `导出时间：${new Date().toLocaleString("zh-CN")}`, ""];
  let questionIndex = 0;

  for (const message of messages) {
    if (message.loading) continue;
    if (message.role === "user") {
      questionIndex += 1;
      lines.push(`## Q${questionIndex}`, "", message.content, "");
    } else {
      lines.push("### 回答", "", message.content, "");
      if (message.sources?.length) {
        lines.push("### 来源", "");
        for (const source of message.sources) {
          const anchorNote = source.anchorId ? ` (${source.anchorId})` : "";
          lines.push(`- ${source.sourceHint}${anchorNote}：${shortQuote(source.quote, 300)}`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

function shortQuote(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function safeFilename(filename: string) {
  return filename.replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_").slice(0, 80) || "document";
}
