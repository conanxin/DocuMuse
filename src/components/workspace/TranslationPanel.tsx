import { mockTranslation } from "@/lib/mockData";

export function TranslationPanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">中文翻译</h2>
      <div className="mt-5 space-y-4">
        {mockTranslation.map((paragraph, index) => (
          <p key={paragraph} className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm leading-7 text-slate-700">
            <span className="mr-2 font-semibold text-blue-600">译文 {index + 1}</span>
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
