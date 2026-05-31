import { mockOverview } from "@/lib/mockData";

export function OverviewPanel() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-blue-600">一句话摘要</p>
        <h2 className="mt-2 text-2xl font-bold leading-9 text-slate-950">{mockOverview.oneLineSummary}</h2>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-950">核心观点</h3>
          <ul className="mt-4 space-y-3">
            {mockOverview.keyPoints.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-6 text-slate-700">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                {point}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-950">文档信息</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">文档类型</dt>
              <dd className="font-medium text-slate-900">{mockOverview.docType}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">语言</dt>
              <dd className="font-medium text-slate-900">{mockOverview.language}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {mockOverview.keywords.map((keyword) => (
              <span key={keyword} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {keyword}
              </span>
            ))}
          </div>
        </section>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-950">分段摘要</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {mockOverview.sectionSummaries.map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
