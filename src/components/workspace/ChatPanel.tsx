"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
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
            endChar: 0
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

export function ChatPanel({ documentId = "demo", isPlaceholder = false, initialMessages = [] }: { documentId?: string; isPlaceholder?: boolean; initialMessages?: DocumentChatMessage[] }) {
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
          sources: [{ sourceHint: "第 2 页 / 第 3 段", quote: "demo 引用来源", startChar: 0, endChar: 0 }]
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <h2 className="font-bold text-slate-950">与文档对话</h2>
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
            {message.role === "assistant" && message.sources?.length ? <SourceList sources={message.sources} /> : null}
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

function SourceList({ sources }: { sources: ChatSource[] }) {
  return (
    <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">
      <p className="font-semibold text-slate-700">来源：</p>
      <ul className="mt-1 space-y-1">
        {sources.slice(0, 5).map((source, index) => (
          // TODO: Later link source hints to the original text viewer position.
          <li key={`${source.sourceHint}-${index}`}>
            {source.sourceHint}：{source.quote.length > 120 ? `${source.quote.slice(0, 120)}...` : source.quote}
          </li>
        ))}
      </ul>
    </div>
  );
}
