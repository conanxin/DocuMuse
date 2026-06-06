"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ensureDocumentStructure } from "@/lib/documentStructure";
import { mockOriginalText } from "@/lib/mockData";
import type { ChatSource, DocumentOutlineNode, ParsedDocument, ParseDiagnostics } from "@/lib/documentTypes";
import { flattenOutline } from "@/lib/outlineExtractor";
import { getEffectiveOutline } from "@/lib/outlineUtils";
import { buildParagraphAnchors, buildParagraphAnchorsFromDocument, type ParagraphAnchor } from "@/lib/sourceAnchors";

type SelectedSource = ChatSource | null;

export function OriginalTextPanel({
  text,
  document,
  pageCount,
  createdAt,
  highlight,
  onClearHighlight,
  onAddOutlineHeading
}: {
  text?: string;
  document?: ParsedDocument | null;
  pageCount?: number;
  createdAt?: string;
  highlight?: SelectedSource;
  onClearHighlight?: () => void;
  onAddOutlineHeading?: (payload: { anchor: ParagraphAnchor; title: string; level: number; type: NonNullable<DocumentOutlineNode["type"]>; insertAfterId?: string }) => void;
}) {
  const [pageJump, setPageJump] = useState("");
  const [locateFailed, setLocateFailed] = useState(false);
  const [hideLowValue, setHideLowValue] = useState(false);
  const [headingDraft, setHeadingDraft] = useState<{ anchor: ParagraphAnchor; title: string; level: number; type: NonNullable<DocumentOutlineNode["type"]>; insertAfterId?: string } | null>(null);
  const fullText = document?.text || text || mockOriginalText.join("\n\n");
  const anchors = useMemo(() => (document ? buildParagraphAnchorsFromDocument(document) : buildParagraphAnchors(fullText)), [document, fullText]);
  const outlineByParagraphId = useMemo(() => {
    const structured = document ? ensureDocumentStructure(document) : null;
    const nodes = structured ? flattenOutline(getEffectiveOutline(structured)) : [];
    return new Map(nodes.map((node) => [node.startParagraphId, node]));
  }, [document]);
  const outlineInsertOptions = useMemo(() => {
    const structured = document ? ensureDocumentStructure(document) : null;
    return structured ? flattenOutline(getEffectiveOutline(structured)).slice(0, 120) : [];
  }, [document]);
  const selectedAnchor = useMemo(() => resolveSelectedAnchor(anchors, highlight), [anchors, highlight]);
  const diagnostics = document?.parseDiagnostics;
  const resolvedPageCount = document?.pages?.length || pageCount || diagnostics?.pageCount || 1;
  const parsedAt = diagnostics?.parsedAt ? new Date(diagnostics.parsedAt).toLocaleString("zh-CN") : createdAt ? new Date(createdAt).toLocaleString("zh-CN") : "Demo 数据";
  const pageOptions = Array.from(new Set(anchors.map((anchor) => anchor.pageNumber).filter((value): value is number => typeof value === "number"))).sort((a, b) => a - b);

  useEffect(() => {
    setLocateFailed(Boolean(highlight && !selectedAnchor));
    if (selectedAnchor) {
      window.setTimeout(() => {
        globalThis.document.getElementById(`source-${selectedAnchor.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  }, [highlight, selectedAnchor]);

  const jumpToPage = (value: string) => {
    setPageJump(value);
    const page = Number(value);
    if (!page) return;
    const target = anchors.find((anchor) => anchor.pageNumber === page);
    if (target) {
      globalThis.document.getElementById(`source-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">原文内容</h2>
          <p className="mt-1 text-sm text-slate-500">按段落生成可定位锚点，聊天来源可跳转到对应段落。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <StatPill>{resolvedPageCount} 页</StatPill>
          <StatPill>{anchors.length.toLocaleString()} 段</StatPill>
          <StatPill>{outlineByParagraphId.size.toLocaleString()} outline</StatPill>
          <StatPill>{(document?.sections?.length ?? 0).toLocaleString()} 节</StatPill>
          <StatPill>{fullText.length.toLocaleString()} 字符</StatPill>
          <StatPill>{parsedAt}</StatPill>
        </div>
      </div>

      <ParseDiagnosticsPanel diagnostics={diagnostics} coordinateDiagnostics={document?.coordinateDiagnostics} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={hideLowValue} onChange={(event) => setHideLowValue(event.target.checked)} />
          隐藏低价值段落
        </label>
        {pageOptions.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            跳转页
            <select value={pageJump} onChange={(event) => jumpToPage(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
              <option value="">选择页码</option>
              {pageOptions.map((page) => (
                <option key={page} value={page}>
                  第 {page} 页
                </option>
              ))}
            </select>
          </label>
        )}
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

      {headingDraft && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-blue-900">设为章节标题</h3>
              <p className="mt-1 text-xs text-blue-700">{headingDraft.anchor.sourceHint}</p>
            </div>
            <button onClick={() => setHeadingDraft(null)} className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-white">
              取消
            </button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_150px_minmax(180px,240px)_auto]">
            <input value={headingDraft.title} onChange={(event) => setHeadingDraft({ ...headingDraft, title: event.target.value })} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700" maxLength={180} />
            <select value={headingDraft.level} onChange={(event) => setHeadingDraft({ ...headingDraft, level: Number(event.target.value) })} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700">
              <option value={1}>Level 1</option>
              <option value={2}>Level 2</option>
              <option value={3}>Level 3</option>
            </select>
            <select value={headingDraft.type} onChange={(event) => setHeadingDraft({ ...headingDraft, type: event.target.value as NonNullable<DocumentOutlineNode["type"]> })} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700">
              {outlineTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {outlineTypeLabel(type)}
                </option>
              ))}
            </select>
            <select value={headingDraft.insertAfterId ?? ""} onChange={(event) => setHeadingDraft({ ...headingDraft, insertAfterId: event.target.value || undefined })} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700">
              <option value="">插入到末尾</option>
              {outlineInsertOptions.map((node) => (
                <option key={node.id} value={node.id}>
                  在「{node.title.slice(0, 32)}」之后
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!headingDraft.title.trim()) return;
                onAddOutlineHeading?.({ ...headingDraft, title: headingDraft.title.trim() });
                setHeadingDraft(null);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              添加
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 max-h-[62vh] space-y-3 overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-4 thin-scrollbar">
        {!anchors.length && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">暂无可显示的原文内容。</div>}
        {anchors.filter((anchor) => !(hideLowValue && anchor.isLowValue)).map((anchor) => {
          const active = selectedAnchor?.id === anchor.id;
          const outlineNode = anchor.paragraphId ? outlineByParagraphId.get(anchor.paragraphId) : undefined;
          return (
            <article id={`source-${anchor.id}`} key={anchor.id} className={`rounded-xl border p-4 text-sm leading-7 transition ${active ? "border-blue-300 bg-yellow-50 shadow-sm" : outlineNode ? "border-blue-100 bg-blue-50/40" : "border-slate-100 bg-white"}`}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className={`font-semibold ${active ? "text-blue-700" : "text-slate-500"}`}>{anchor.sourceHint}</span>
                <span className="text-slate-400">{anchor.outlineTitle || anchor.sectionTitle ? `Outline: ${anchor.outlineTitle || anchor.sectionTitle}` : `${anchor.startChar + 1}-${anchor.endChar}`}</span>
              </div>
              <ParagraphOutlineTag node={outlineNode} />
              <ParagraphQualityTags anchor={anchor} />
              <ParagraphCoordinateTag anchor={anchor} />
              {document && onAddOutlineHeading && (
                <button
                  onClick={() =>
                    setHeadingDraft({
                      anchor,
                      title: anchor.text.slice(0, 80),
                      level: 1,
                      type: "section",
                      insertAfterId: undefined
                    })
                  }
                  className="mb-2 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:border-blue-200 hover:text-blue-700"
                >
                  设为章节标题
                </button>
              )}
              <p className={`${active ? "border-l-4 border-blue-500 pl-3 text-slate-900" : outlineNode ? "text-base font-semibold text-slate-900" : "text-slate-700"}`}>{anchor.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const outlineTypeOptions: NonNullable<DocumentOutlineNode["type"]>[] = ["abstract", "introduction", "section", "subsection", "conclusion", "references", "appendix", "unknown"];

function ParseDiagnosticsPanel({ diagnostics, coordinateDiagnostics }: { diagnostics?: ParseDiagnostics; coordinateDiagnostics?: ParsedDocument["coordinateDiagnostics"] }) {
  if (!diagnostics && !coordinateDiagnostics) {
    return <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">暂无解析诊断信息。</div>;
  }

  const lowTextPages = diagnostics?.pageDiagnostics?.filter((page) => page.lowTextDensity).length ?? 0;
  const repeatedLines = diagnostics?.suspectedHeaderFooterLines ?? diagnostics?.repeatedLineCandidates ?? [];
  const coordinateAvailable = coordinateDiagnostics?.coordinateAvailable ?? false;
  const positionedParagraphCount = coordinateDiagnostics?.positionedParagraphCount ?? 0;
  const unpositionedParagraphCount = coordinateDiagnostics?.unpositionedParagraphCount ?? 0;
  const coordinateTotal = positionedParagraphCount + unpositionedParagraphCount;
  const coordinateRate = coordinateTotal > 0 ? Math.round((positionedParagraphCount / coordinateTotal) * 100) : null;

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {diagnostics && <QualityPill diagnostics={diagnostics} />}
        <StatPill>质量分数：{typeof diagnostics?.qualityScore === "number" ? `${diagnostics.qualityScore} / 100` : "未知"}</StatPill>
        <StatPill>语言：{languageLabel(diagnostics?.languageGuess)}</StatPill>
        <StatPill>空页：{diagnostics?.emptyPageCount ?? 0}</StatPill>
        <StatPill>低文本页：{lowTextPages}</StatPill>
        <StatPill>低价值段落：{diagnostics?.lowValueParagraphCount ?? 0}</StatPill>
        <StatPill>页眉/页脚段落：{diagnostics?.repeatedHeaderFooterParagraphCount ?? 0}</StatPill>
        <StatPill>页码段落：{diagnostics?.pageNumberParagraphCount ?? 0}</StatPill>
        <StatPill>PDF 坐标层：{coordinateAvailable ? "可用" : "不可用"}</StatPill>
        <StatPill>文本块：{coordinateDiagnostics?.textItemCount ?? 0}</StatPill>
        <StatPill>已定位段落：{positionedParagraphCount}</StatPill>
        <StatPill>未定位段落：{unpositionedParagraphCount}</StatPill>
        <StatPill>坐标定位率：{coordinateRate === null ? "未知" : `${coordinateRate}%`}</StatPill>
        {repeatedLines.length > 0 && <StatPill>疑似页眉页脚：{repeatedLines.length}</StatPill>}
      </div>

      {coordinateDiagnostics && !coordinateAvailable && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">该 PDF 暂未提取到可用坐标层，来源仍可按段落定位。</div>
      )}

      {(diagnostics?.lowValueParagraphCount ?? 0) > 0 && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">检测到可能的页眉、页脚或页码段落。DocuMuse 会在问答检索和全文分析中自动降低这些内容的权重。</div>
      )}

      {diagnostics?.suspectedScannedPdf && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">该 PDF 可能是扫描版，当前版本暂不支持 OCR。</div>
      )}

      <details className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700">查看解析诊断详情</summary>
        <div className="mt-3 grid gap-3 text-slate-600">
          <DiagnosticList title="Warnings" items={[...(diagnostics?.warnings ?? []), ...(coordinateDiagnostics?.warnings ?? [])]} />
          <DiagnosticList title="疑似页眉/页脚" items={repeatedLines} />
          <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs">
            <span>总页数：{diagnostics?.pageCount ?? coordinateDiagnostics?.pageCount ?? 0}</span>
            <span>平均每页字符：{diagnostics?.averageCharsPerPage ?? 0}</span>
            <span>参考文献区域：{diagnostics?.suspectedReferenceSection ? "疑似存在" : "未检测到"}</span>
            <span>脚注候选：{diagnostics?.suspectedFootnoteCount ?? 0}</span>
            <span>标题候选：{diagnostics?.headingCandidateCount ?? 0}</span>
            <span>坐标提取器：{coordinateDiagnostics?.extractor ?? "未提取"}</span>
          </div>
          {diagnostics?.pageDiagnostics?.length ? (
            <div className="max-h-48 overflow-auto rounded-lg border border-slate-100">
              {diagnostics.pageDiagnostics.slice(0, 40).map((page) => (
                <div key={page.pageNumber} className="grid grid-cols-4 gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
                  <span>第 {page.pageNumber} 页</span>
                  <span>{page.textLength} 字符</span>
                  <span>{page.paragraphCount} 段</span>
                  <span>{page.empty ? "空页" : page.lowTextDensity ? "文本较少" : "正常"}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function DiagnosticList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <ul className="space-y-1">
        {items.slice(0, 8).map((item) => (
          <li key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ParagraphOutlineTag({ node }: { node?: DocumentOutlineNode }) {
  if (!node) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">Outline heading</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-blue-100">Level {node.level}</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-blue-100">{outlineTypeLabel(node.type)}</span>
    </div>
  );
}

function outlineTypeLabel(type?: DocumentOutlineNode["type"]) {
  if (type === "abstract") return "Abstract";
  if (type === "introduction") return "Introduction";
  if (type === "conclusion") return "Conclusion";
  if (type === "references") return "References";
  if (type === "appendix") return "Appendix";
  return "Section";
}

function ParagraphQualityTags({ anchor }: { anchor: ParagraphAnchor }) {
  const flags = anchor.qualityFlags ?? [];
  if (!flags.length) return null;
  const labels = flags
    .map((flag) => {
      if (flag === "repeated_header_footer") return "页眉/页脚候选";
      if (flag === "page_number") return "页码";
      if (flag === "likely_footnote") return "脚注候选";
      if (flag === "likely_reference") return "参考文献候选";
      if (flag === "very_short_or_symbol_only") return "低价值";
      return "";
    })
    .filter(Boolean);
  if (!labels.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {labels.slice(0, 4).map((label) => (
        <span key={label} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
          {label}
        </span>
      ))}
    </div>
  );
}

function ParagraphCoordinateTag({ anchor }: { anchor: ParagraphAnchor }) {
  if (!anchor.coordinateAvailable) return null;
  return (
    <div className="mb-2">
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
        {anchor.coordinateConfidence === "low" ? "近似定位" : "坐标已定位"}
      </span>
      {anchor.boundingBox && (
        <details className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600">查看坐标详情</summary>
          <div className="mt-2 grid gap-1">
            <span>pageNumber: {anchor.pageNumber ?? "未知"}</span>
            <span>confidence: {anchor.coordinateConfidence ?? "unknown"}</span>
            <span>
              x={formatCoordinateNumber(anchor.boundingBox.x)}, y={formatCoordinateNumber(anchor.boundingBox.y)}, width={formatCoordinateNumber(anchor.boundingBox.width)}, height={formatCoordinateNumber(anchor.boundingBox.height)}
            </span>
          </div>
        </details>
      )}
    </div>
  );
}

function formatCoordinateNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function StatPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{children}</span>;
}

function QualityPill({ diagnostics }: { diagnostics: ParseDiagnostics }) {
  const label = diagnostics.qualityLabel ?? "unknown";
  const classes = label === "good" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : label === "fair" ? "bg-amber-50 text-amber-700 ring-amber-200" : label === "poor" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-100 text-slate-600 ring-slate-200";
  return <span className={`rounded-full px-3 py-1 ring-1 ${classes}`}>解析质量：{qualityLabel(label)}</span>;
}

function qualityLabel(label: ParseDiagnostics["qualityLabel"]) {
  if (label === "good") return "良好";
  if (label === "fair") return "一般";
  if (label === "poor") return "较差";
  return "未知";
}

function languageLabel(label: ParseDiagnostics["languageGuess"]) {
  if (label === "zh") return "中文";
  if (label === "en") return "英文";
  if (label === "mixed") return "中英混合";
  return "未知";
}

function resolveSelectedAnchor(anchors: ParagraphAnchor[], source?: SelectedSource) {
  if (!source) return null;
  if (source.paragraphId) {
    const byParagraph = anchors.find((anchor) => anchor.paragraphId === source.paragraphId);
    if (byParagraph) return byParagraph;
  }
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
