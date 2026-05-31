import { mockSectionAnalysis } from "@/lib/mockData";

export function SectionAnalysisPanel() {
  return (
    <div className="space-y-4">
      {mockSectionAnalysis.map((item) => (
        <article key={item.section} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">{item.section}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{item.page}</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">核心观点</h3>
              <ul className="mt-3 space-y-2">
                {item.points.map((point) => (
                  <li key={point} className="text-sm text-slate-600">· {point}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">可引用句子</h3>
              <p className="mt-3 text-sm leading-6 text-slate-700">“{item.quote}”</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
