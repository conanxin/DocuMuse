"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatSource } from "@/lib/documentTypes";
import {
  convertBoundingBoxToViewportBox,
  type PdfCoordinateMappingResult,
  type PdfCoordinateSystem
} from "@/lib/pdfCoordinateMapping";

type PdfViewportLike = { width: number; height: number; scale?: number };
type PdfRenderTaskLike = { promise: Promise<void>; cancel?: () => void };
type PdfPageLike = {
  getViewport: (options: { scale: number }) => PdfViewportLike;
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewportLike }) => PdfRenderTaskLike;
};
type PdfDocumentLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
};
type PdfLoadingTaskLike = {
  promise: Promise<PdfDocumentLike>;
  destroy?: () => void | Promise<void>;
};
type PdfJsLike = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: unknown) => PdfLoadingTaskLike;
};

const ZOOM_PRESETS = [90, 100, 125, 150];

export function PdfPreviewPanel({
  documentId,
  selectedSource
}: {
  documentId: string;
  selectedSource?: ChatSource | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentLike | null>(null);
  const [pageNumber, setPageNumber] = useState(selectedSource?.pageNumber ?? 1);
  const [pageCount, setPageCount] = useState(0);
  const [viewport, setViewport] = useState<PdfViewportLike | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const coordinateSystem: PdfCoordinateSystem = "viewport_top_left";

  useEffect(() => {
    if (selectedSource?.pageNumber) {
      setPageNumber(selectedSource.pageNumber);
    }
  }, [selectedSource?.pageNumber]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PdfLoadingTaskLike | undefined;

    async function loadPdf() {
      setLoadState("loading");
      setMessage("");

      try {
        const importPdfModule = new Function("url", "return import(url)") as (url: string) => Promise<PdfJsLike>;
        const pdfjs = await importPdfModule("/api/pdf-module");
        pdfjs.GlobalWorkerOptions.workerSrc = "/api/pdf-worker";
        loadingTask = pdfjs.getDocument({ url: `/api/documents/${documentId}/file` });
        const pdf = await loadingTask.promise;

        if (!cancelled) {
          setPdfDocument(pdf);
          setPageCount(pdf.numPages);
          setPageNumber((current) => Math.min(Math.max(current || 1, 1), pdf.numPages));
          setLoadState("ready");
        }
      } catch {
        if (!cancelled) {
          setLoadState("error");
          setMessage("PDF 预览暂不可用，仍可使用原文段落定位。");
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      void loadingTask?.destroy?.();
    };
  }, [documentId]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;

    let cancelled = false;
    let renderTask: PdfRenderTaskLike | undefined;
    const currentPdfDocument = pdfDocument;

    async function renderPage() {
      try {
        const page = await currentPdfDocument.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const scale = zoomPercent / 100;
        const nextViewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(nextViewport.width);
        canvas.height = Math.floor(nextViewport.height);
        canvas.style.width = `${Math.floor(nextViewport.width)}px`;
        canvas.style.height = `${Math.floor(nextViewport.height)}px`;
        setViewport(nextViewport);

        renderTask = page.render({ canvasContext: context, viewport: nextViewport });
        await renderTask.promise;
      } catch {
        if (!cancelled) {
          setLoadState("error");
          setMessage("PDF 页面渲染失败，仍可使用原文段落定位。");
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      void renderTask?.cancel?.();
    };
  }, [pdfDocument, pageNumber, zoomPercent]);

  const selectedSourcePage = selectedSource?.pageNumber;
  const sourceMatchesCurrentPage = !selectedSourcePage || selectedSourcePage === pageNumber;
  const overlayMapping = useMemo<PdfCoordinateMappingResult>(() => {
    if (!selectedSource?.boundingBox || !viewport || !sourceMatchesCurrentPage) return { box: null };
    const scale = typeof viewport.scale === "number" && Number.isFinite(viewport.scale) ? viewport.scale : zoomPercent / 100;
    return convertBoundingBoxToViewportBox({
      boundingBox: selectedSource.boundingBox,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      pageWidth: viewport.width / scale,
      pageHeight: viewport.height / scale,
      coordinateSystem,
      minWidth: 8,
      minHeight: 8
    });
  }, [coordinateSystem, selectedSource, sourceMatchesCurrentPage, viewport, zoomPercent]);
  const overlayBox = overlayMapping.box;

  if (loadState === "error") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">PDF 预览</h2>
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {message || "PDF 预览暂不可用，仍可使用原文段落定位。"}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">PDF 预览</h2>
          <p className="mt-1 text-sm text-slate-500">
            实验性单页预览。坐标高亮为 best-effort，复杂版式可能存在偏移。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loadState === "loading" || pageNumber <= 1}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-slate-500">
            {pageNumber} / {pageCount || "?"}
          </span>
          <button
            type="button"
            disabled={loadState === "loading" || !pageCount || pageNumber >= pageCount}
            onClick={() => setPageNumber((current) => Math.min(pageCount || current, current + 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
          >
            下一页
          </button>
          <div className="ml-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
            <button
              type="button"
              onClick={() => setZoomPercent((current) => Math.max(90, current - 25))}
              className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              -
            </button>
            {ZOOM_PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setZoomPercent(value)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  zoomPercent === value ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {value}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => setZoomPercent((current) => Math.min(150, current + 25))}
              className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        PDF 预览为实验功能，坐标高亮为近似定位；如有偏移，请以原文段落定位为准。
      </p>

      {loadState === "loading" && (
        <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          正在加载 PDF 预览...
        </p>
      )}
      {loadState === "ready" && selectedSource && !selectedSource.boundingBox && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          当前来源暂无 PDF 页面坐标。
        </p>
      )}
      {loadState === "ready" && selectedSource?.boundingBox && !selectedSourcePage && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          当前来源缺少页码，暂在当前页尝试近似显示。
        </p>
      )}
      {loadState === "ready" && selectedSource?.boundingBox && selectedSourcePage && selectedSourcePage !== pageNumber && (
        <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          当前来源位于第 {selectedSourcePage} 页，切换到该页后会显示高亮区域。
        </p>
      )}
      {loadState === "ready" && selectedSource?.coordinateConfidence === "low" && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          该高亮区域为低置信度近似定位。
        </p>
      )}
      {loadState === "ready" && overlayMapping.warning && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {overlayMapping.warning}
        </p>
      )}

      <PdfOverlayDiagnostics
        pageNumber={pageNumber}
        viewport={viewport}
        zoomPercent={zoomPercent}
        selectedSource={selectedSource}
        overlayMapping={overlayMapping}
        coordinateSystem={coordinateSystem}
      />

      <div className="mt-5 max-h-[68vh] overflow-auto rounded-2xl border border-slate-100 bg-slate-100 p-4 thin-scrollbar">
        <div className="relative mx-auto w-fit bg-white shadow-sm">
          <canvas ref={canvasRef} className="block" />
          {overlayBox && (
            <div
              className="pointer-events-none absolute rounded-md border-2 border-blue-500 bg-blue-400/25 shadow-[0_0_0_2px_rgba(37,99,235,0.18)]"
              style={{
                left: overlayBox.left,
                top: overlayBox.top,
                width: overlayBox.width,
                height: overlayBox.height
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function PdfOverlayDiagnostics({
  pageNumber,
  viewport,
  zoomPercent,
  selectedSource,
  overlayMapping,
  coordinateSystem
}: {
  pageNumber: number;
  viewport: PdfViewportLike | null;
  zoomPercent: number;
  selectedSource?: ChatSource | null;
  overlayMapping: PdfCoordinateMappingResult;
  coordinateSystem: PdfCoordinateSystem;
}) {
  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-slate-700">PDF 坐标诊断</summary>
      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <DiagnosticItem label="当前页码" value={String(pageNumber)} />
        <DiagnosticItem label="缩放" value={`${zoomPercent}%`} />
        <DiagnosticItem label="坐标系" value={coordinateSystem} />
        <DiagnosticItem
          label="canvas / viewport"
          value={viewport ? `${Math.round(viewport.width)} x ${Math.round(viewport.height)}` : "尚未渲染"}
        />
        <DiagnosticItem label="source page" value={selectedSource?.pageNumber ? String(selectedSource.pageNumber) : "未知"} />
        <DiagnosticItem label="confidence" value={selectedSource?.coordinateConfidence ?? "unknown"} />
        <DiagnosticItem label="raw boundingBox" value={formatBox(selectedSource?.boundingBox)} />
        <DiagnosticItem label="overlay box" value={formatBox(overlayMapping.box)} />
        <DiagnosticItem label="warning" value={overlayMapping.warning ?? "无"} />
      </div>
    </details>
  );
}

function DiagnosticItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <span className="block text-slate-400">{label}</span>
      <span className="mt-1 block break-all font-medium text-slate-700">{value}</span>
    </div>
  );
}

function formatBox(box?: { x?: number; y?: number; width?: number; height?: number; left?: number; top?: number } | null) {
  if (!box) return "无";
  const x = "left" in box ? box.left : box.x;
  const y = "top" in box ? box.top : box.y;
  return `x=${formatNumber(x)}, y=${formatNumber(y)}, width=${formatNumber(box.width)}, height=${formatNumber(box.height)}`;
}

function formatNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "n/a";
}
