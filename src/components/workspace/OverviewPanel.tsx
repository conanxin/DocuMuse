import { documentKindConfidenceLabel, documentKindLabel } from "@/lib/documentKindDetector";
import { mockOverview } from "@/lib/mockData";
import type { DocumentAnalysis, DocumentKindDetection } from "@/lib/documentTypes";

export function OverviewPanel({ analysis, documentKind }: { analysis?: DocumentAnalysis; documentKind?: DocumentKindDetection }) {
  const overview = analysis
    ? {
        oneLineSummary: analysis.oneSentenceSummary,
        keyPoints: analysis.keyPoints,
        keywords: analysis.keywords,
        docType: analysis.documentType,
        language: analysis.language,
        sectionSummaries: analysis.sectionSummaries
      }
    : mockOverview;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-blue-600">一句话摘要</p>
        <h2 className="mt-2 text-2xl font-bold leading-9 text-slate-950">{overview.oneLineSummary}</h2>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-950">核心观点</h3>
          <ul className="mt-4 space-y-3">
            {overview.keyPoints.map((point) => (
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
            <InfoRow label="分析类型" value={overview.docType} />
            <InfoRow label="语言" value={overview.language} />
            <InfoRow label="类型识别" value={documentKindLabel(documentKind?.kind)} />
            <InfoRow label="置信度" value={documentKindConfidenceLabel(documentKind?.confidence)} />
          </dl>

          {documentKind && (
            <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <summary className="cursor-pointer font-medium text-slate-700">查看类型识别理由</summary>
              {documentKind.confidence === "low" && <p className="mt-2 text-amber-700">文档类型识别置信度较低，后续分析可能以通用模式处理。</p>}
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {(documentKind.reasons?.length ? documentKind.reasons : ["暂无明确识别理由。"]).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {overview.keywords.map((keyword) => (
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
          {overview.sectionSummaries.map((item) => (
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
