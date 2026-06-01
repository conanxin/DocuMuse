"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mockOriginalText } from "@/lib/mockData";
import type { ChatSource } from "@/lib/documentTypes";

type HighlightRange = ChatSource | null;

export function OriginalTextPanel({
  text,
  pageCount,
  createdAt,
  highlight,
  onClearHighlight
}: {
  text?: string;
  pageCount?: number;
  createdAt?: string;
  highlight?: HighlightRange;
  onClearHighlight?: () => void;
}) {
  const highlightRef = useRef<HTMLSpanElement>(null);
  const [locateFailed, setLocateFailed] = useState(false);
  const fullText = text || mockOriginalText.join("\n\n");
  const textLength = fullText.length;
  const parsedAt = createdAt ? new Date(createdAt).toLocaleString("zh-CN") : "Demo 数据";

  const resolvedRange = useMemo(() => resolveHighlight(fullText, highlight), [fullText, highlight]);

  useEffect(() => {
    setLocateFailed(Boolean(highlight && !resolvedRange));
    if (resolvedRange) {
      window.setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
  }, [highlight, resolvedRange]);

  const paragraphs = useMemo(() => splitText(fullText, resolvedRange), [fullText, resolvedRange]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">原文内容</h2>
          <p className="mt-1 text-sm text-slate-500">展示 PDF 文本层提取结果，可从聊天来源定位引用片段。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">{pageCount ?? paragraphs.length} 页</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{textLength.toLocaleString()} 字符</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{parsedAt}</span>
        </div>
      </div>

      {highlight && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${locateFailed ? "border border-amber-200 bg-amber-50 text-amber-700" : "border border-yellow-200 bg-yellow-50 text-yellow-800"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              {locateFailed ? "未能在原文中定位该引用，但来源片段仍可参考。" : `当前高亮：${highlight.sourceHint || "来源片段"}`}
            </p>
            {onClearHighlight && (
              <button onClick={onClearHighlight} className="rounded-lg border border-current px-3 py-1 text-xs font-medium hover:bg-white/60">
                清除高亮
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 max-h-[62vh] overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-4 thin-scrollbar">
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {paragraphs.map((part, index) =>
            part.highlight ? (
              <span key={`${index}-${part.text.slice(0, 16)}`} ref={highlightRef} className="rounded-md bg-yellow-200 px-1 py-0.5 text-slate-950 ring-1 ring-yellow-300">
                {part.text}
              </span>
            ) : (
              <span key={`${index}-${part.text.slice(0, 16)}`}>{part.text}</span>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function resolveHighlight(text: string, highlight?: HighlightRange) {
  if (!highlight) return null;
  const safeStart = Number.isFinite(highlight.startChar) ? Math.max(0, highlight.startChar) : -1;
  const safeEnd = Number.isFinite(highlight.endChar) ? Math.min(text.length, highlight.endChar) : -1;
  if (safeStart >= 0 && safeEnd > safeStart && safeStart < text.length) {
    return { start: safeStart, end: safeEnd };
  }

  const quote = highlight.quote?.trim();
  if (!quote) return null;
  const exactIndex = text.indexOf(quote);
  if (exactIndex >= 0) return { start: exactIndex, end: exactIndex + quote.length };

  const shortQuote = quote.slice(0, 80);
  const looseIndex = shortQuote ? text.indexOf(shortQuote) : -1;
  if (looseIndex >= 0) return { start: looseIndex, end: looseIndex + shortQuote.length };
  return null;
}

function splitText(text: string, range: { start: number; end: number } | null) {
  if (!range) return [{ text, highlight: false }];
  return [
    { text: text.slice(0, range.start), highlight: false },
    { text: text.slice(range.start, range.end), highlight: true },
    { text: text.slice(range.end), highlight: false }
  ].filter((part) => part.text.length > 0);
}
