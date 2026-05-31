import { mockTranslation } from "@/lib/mockData";

export function TranslationPanel({ translation }: { translation?: string }) {
  const paragraphs = translation
    ? translation
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : mockTranslation;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">中文翻译 / 改写</h2>
      {!translation && <p className="mt-2 text-sm text-slate-500">点击开始分析后生成真实内容。</p>}
      <div className="mt-5 space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 32)}`} className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm leading-7 text-slate-700">
            <span className="mr-2 font-semibold text-blue-600">译文 {index + 1}</span>
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
