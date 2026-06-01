"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mockOriginalText } from "@/lib/mockData";
import type { ChatSource } from "@/lib/documentTypes";
import { buildParagraphAnchors, type ParagraphAnchor } from "@/lib/sourceAnchors";

type SelectedSource = ChatSource | null;

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
  highlight?: SelectedSource;
  onClearHighlight?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [locateFailed, setLocateFailed] = useState(false);
  const fullText = text || mockOriginalText.join("\n\n");
  const anchors = useMemo(() => buildParagraphAnchors(fullText), [fullText]);
  const selectedAnchor = useMemo(() => resolveSelectedAnchor(anchors, highlight), [anchors, highlight]);
  const textLength = fullText.length;
  const parsedAt = createdAt ? new Date(createdAt).toLocaleString("zh-CN") : "Demo 数据";

  useEffect(() => {
    setLocateFailed(Boolean(highlight && !selectedAnchor));
    if (selectedAnchor) {
      window.setTimeout(() => {
        document.getElementById(`source-${selectedAnchor.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  }, [highlight, selectedAnchor]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">原文内容</h2>
          <p className="mt-1 text-sm text-slate-500">按段落生成可定位锚点，聊天来源可跳转到对应段落。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">{pageCount ?? anchors.length} 页</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{anchors.length.toLocaleString()} 段</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{textLength.toLocaleString()} 字符</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{parsedAt}</span>
        </div>
      </div>

      {highlight && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${locateFailed ? "border border-amber-200 bg-amber-50 text-amber-700" : "border border-yellow-200 bg-yellow-50 text-yellow-800"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{locateFailed ? "未能在原文中定位该引用，但来源片段仍可参考。" : `当前定位：${highlight.sourceHint || selectedAnchor?.sourceHint || "来源片段"}`}</p>
            {onClearHighlight && (
              <button onClick={onClearHighlight} className="rounded-lg border border-current px-3 py-1 text-xs font-medium hover:bg-white/60">
                清除高亮
              </button>
            )}
          </div>
        </div>
      )}

      <div ref={containerRef} className="mt-5 max-h-[62vh] space-y-3 overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-4 thin-scrollbar">
        {!anchors.length && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">暂无可显示的原文内容。</div>}
        {anchors.map((anchor) => {
          const active = selectedAnchor?.id === anchor.id;
          return (
            <article id={`source-${anchor.id}`} key={anchor.id} className={`rounded-xl border p-4 text-sm leading-7 transition ${active ? "border-blue-300 bg-yellow-50 shadow-sm" : "border-slate-100 bg-white"}`}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className={`font-semibold ${active ? "text-blue-700" : "text-slate-500"}`}>{anchor.sourceHint}</span>
                <span className="text-slate-400">
                  {anchor.startChar + 1}-{anchor.endChar}
                </span>
              </div>
              <p className={`${active ? "border-l-4 border-blue-500 pl-3 text-slate-900" : "text-slate-700"}`}>{anchor.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function resolveSelectedAnchor(anchors: ParagraphAnchor[], source?: SelectedSource) {
  if (!source) return null;
  if (source.anchorId) {
    const byAnchor = anchors.find((anchor) => anchor.id === source.anchorId);
    if (byAnchor) return byAnchor;
  }

  const safeStart = Number.isFinite(source.startChar) ? source.startChar : undefined;
  const safeEnd = Number.isFinite(source.endChar) ? source.endChar : undefined;
  if (typeof safeStart === "number" && typeof safeEnd === "number" && safeEnd > safeStart) {
    const byRange =
      anchors.find((anchor) => safeStart >= anchor.startChar && safeStart < anchor.endChar) ??
      anchors.find((anchor) => safeEnd > anchor.startChar && safeEnd <= anchor.endChar) ??
      anchors.find((anchor) => safeStart <= anchor.startChar && safeEnd >= anchor.endChar);
    if (byRange) return byRange;
  }

  const quote = source.quote?.trim();
  if (quote) {
    const exact = anchors.find((anchor) => anchor.text.includes(quote));
    if (exact) return exact;
    const shortQuote = quote.slice(0, 80);
    if (shortQuote) {
      const loose = anchors.find((anchor) => anchor.text.includes(shortQuote));
      if (loose) return loose;
    }
  }

  return null;
}
