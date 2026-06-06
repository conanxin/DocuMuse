"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatSource } from "@/lib/documentTypes";

type ViewportBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PdfBoundingBox = NonNullable<ChatSource["boundingBox"]>;
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
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

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

        const scale = 1.35;
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
  }, [pdfDocument, pageNumber]);

  const overlayBox = useMemo(() => {
    if (!selectedSource?.boundingBox || !viewport || selectedSource.pageNumber !== pageNumber) return null;
    return convertBoundingBoxToViewportBox(selectedSource.boundingBox, viewport);
  }, [pageNumber, selectedSource, viewport]);

  if (loadState === "error") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">PDF 预览</h2>
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{message || "PDF 预览暂不可用，仍可使用原文段落定位。"}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">PDF 预览</h2>
          <p className="mt-1 text-sm text-slate-500">实验性单页预览。坐标高亮为 best-effort，复杂版式可能存在偏移。</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={loadState === "loading" || pageNumber <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50">
            上一页
          </button>
          <span className="text-sm text-slate-500">
            {pageNumber} / {pageCount || "?"}
          </span>
          <button type="button" disabled={loadState === "loading" || !pageCount || pageNumber >= pageCount} onClick={() => setPageNumber((current) => Math.min(pageCount || current, current + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50">
            下一页
          </button>
        </div>
      </div>

      {loadState === "loading" && <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">正在加载 PDF 预览...</p>}

      {loadState === "ready" && selectedSource && !selectedSource.boundingBox && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">当前来源暂无 PDF 页面坐标。</p>}
      {loadState === "ready" && selectedSource?.boundingBox && selectedSource.pageNumber !== pageNumber && <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">当前来源位于第 {selectedSource.pageNumber} 页，切换到该页后会显示高亮区域。</p>}

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

export function convertBoundingBoxToViewportBox(boundingBox: PdfBoundingBox, viewport: PdfViewportLike): ViewportBox {
  const scale = typeof viewport.scale === "number" && Number.isFinite(viewport.scale) ? viewport.scale : 1;
  const left = clamp(boundingBox.x * scale, 0, viewport.width);
  const top = clamp(boundingBox.y * scale, 0, viewport.height);
  const width = clamp(boundingBox.width * scale, 1, viewport.width - left);
  const height = clamp(boundingBox.height * scale, 1, viewport.height - top);
  return { left, top, width, height };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, Math.max(min, max)));
}
