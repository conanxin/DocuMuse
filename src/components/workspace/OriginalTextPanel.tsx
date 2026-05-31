import { mockOriginalText } from "@/lib/mockData";

export function OriginalTextPanel({
  text,
  pageCount,
  createdAt
}: {
  text?: string;
  pageCount?: number;
  createdAt?: string;
}) {
  const paragraphs = text
    ? text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : mockOriginalText;
  const textLength = text?.length ?? paragraphs.join("").length;
  const parsedAt = createdAt ? new Date(createdAt).toLocaleString("zh-CN") : "Demo 数据";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">原文内容</h2>
          <p className="mt-1 text-sm text-slate-500">展示 PDF 文本层提取结果。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">{pageCount ?? paragraphs.length} 页</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{textLength.toLocaleString()} 字符</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{parsedAt}</span>
        </div>
      </div>
      <div className="mt-5 max-h-[62vh] space-y-4 overflow-auto pr-2 thin-scrollbar">
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 32)}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
            <span className="mr-2 font-semibold text-blue-600">P{index + 1}</span>
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
