import { mockOriginalText } from "@/lib/mockData";

export function OriginalTextPanel({ text }: { text?: string }) {
  const paragraphs = text
    ? text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : mockOriginalText;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">原文内容</h2>
      <div className="mt-5 space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p key={paragraph} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
            <span className="mr-2 font-semibold text-blue-600">P{index + 1}</span>
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
