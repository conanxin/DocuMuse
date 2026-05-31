"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { mockChatMessages } from "@/lib/mockData";

const quickQuestions = ["这篇文章讲了什么？", "有哪些核心观点？", "有哪些值得引用的句子？", "帮我生成一篇中文总结"];

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  source?: string;
};

export function ChatPanel({ isPlaceholder = false }: { isPlaceholder?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [input, setInput] = useState("");

  const send = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: "user", content: trimmed },
      {
        role: "assistant",
        content: "这是一个 mock 回复：根据文档内容，我会优先引用原文中的关键段落，并给出可追溯的回答。",
        source: "来源：第 2 页 / 第 3 段"
      }
    ]);
    setInput("");
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(input);
  };

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <h2 className="font-bold text-slate-950">与文档对话</h2>
        {isPlaceholder && <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">此模块将在 LLM 接入后生成真实内容。</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickQuestions.map((question) => (
            <button key={question} onClick={() => send(question)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700">
              {question}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4 thin-scrollbar">
        {messages.map((message, index) => (
          <div key={`${message.content}-${index}`} className={`rounded-2xl px-4 py-3 ${message.role === "user" ? "ml-8 bg-blue-600 text-white" : "mr-8 bg-slate-100 text-slate-800"}`}>
            <p className="text-sm leading-6">{message.content}</p>
            {message.source && <p className={`mt-2 text-xs ${message.role === "user" ? "text-blue-100" : "text-slate-500"}`}>{message.source}</p>}
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="向文档提问…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button aria-label="发送" className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700">
            <Send size={16} />
          </button>
        </div>
      </form>
    </aside>
  );
}
