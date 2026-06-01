"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, Loader2, Send, Trash2 } from "lucide-react";
import { mockChatMessages } from "@/lib/mockData";
import type { ChatSource, DocumentChatMessage } from "@/lib/documentTypes";

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
  return mockChatMessages.map((message, index) => ({
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

  useEffect(() => {
    if (isDemo) {
      setMessages(mockMessages());
      return;
    }
    setMessages(initialMessages);
  }, [isDemo, initialMessages]);

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
          content: "这是一个 mock 回复：根据文档内容，我会优先引用原文中的关键段落，并给出可追溯的回答。",
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
        {isPlaceholder && <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">基于轻量段落检索生成回答，并显示来源引用。</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickQuestions.map((question) => (
            <button key={question} onClick={() => void send(question)} disabled={sending} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {question}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{error}</p>}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4 thin-scrollbar">
        {messages.map((message) => (
          <div key={message.id} className={`rounded-2xl px-4 py-3 ${message.role === "user" ? "ml-8 bg-blue-600 text-white" : "mr-8 bg-slate-100 text-slate-800"}`}>
            <div className="flex items-start gap-2">
              {message.loading && <Loader2 className="mt-1 shrink-0 animate-spin text-slate-500" size={14} />}
              <p className="text-sm leading-6">{message.content}</p>
            </div>
            {message.role === "assistant" && message.sources?.length ? <SourceList sources={message.sources} selectedSource={selectedSource} onSourceClick={onSourceClick} /> : null}
          </div>
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
    </aside>
  );
}

function SourceList({ sources, selectedSource, onSourceClick }: { sources: ChatSource[]; selectedSource?: ChatSource | null; onSourceClick?: (source: ChatSource) => void }) {
  return (
    <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">
      <p className="font-semibold text-slate-700">来源</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {sources.slice(0, 5).map((source, index) => {
          const active = isSameSource(source, selectedSource);
          return (
          <button key={`${source.sourceHint}-${index}`} onClick={() => onSourceClick?.(source)} className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${active ? "border-blue-300 bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}`}>
            <span className="font-medium">{source.sourceHint}</span>
            <span className="block max-w-[220px] truncate">{source.quote}</span>
          </button>
          );
        })}
      </div>
    </div>
  );
}

function isSameSource(source: ChatSource, selected?: ChatSource | null) {
  if (!selected) return false;
  if (source.anchorId && selected.anchorId) return source.anchorId === selected.anchorId;
  return source.startChar === selected.startChar && source.endChar === selected.endChar && source.sourceHint === selected.sourceHint;
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
          const anchorNote = source.anchorId ? `（${source.anchorId}）` : "";
          lines.push(`- ${source.sourceHint}${anchorNote}：${source.quote.slice(0, 300)}`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

function safeFilename(filename: string) {
  return filename.replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_").slice(0, 80) || "document";
}
