import type { PdfCoordinateDiagnostics, PdfTextItemBox } from "./documentTypes";

type CoordinateExtractionResult = {
  textItems: PdfTextItemBox[];
  diagnostics: PdfCoordinateDiagnostics;
};

type PdfJsTextItem = {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
  fontName?: string;
};

export async function extractPdfTextCoordinates(buffer: Buffer): Promise<CoordinateExtractionResult> {
  const baseDiagnostics = {
    extractor: "pdfjs-dist",
    extractedAt: new Date().toISOString(),
    pageCount: 0,
    textItemCount: 0,
    positionedParagraphCount: 0,
    unpositionedParagraphCount: 0,
    coordinateAvailable: false,
    warnings: ["Coordinates use pdfjs-dist viewport coordinates at scale 1 with top-left origin."]
  };

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      isEvalSupported: false,
      useWorkerFetch: false
    });
    const pdf = await loadingTask.promise;
    const textItems: PdfTextItemBox[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent({ includeMarkedContent: false });
      for (const item of textContent.items as PdfJsTextItem[]) {
        const text = typeof item.str === "string" ? item.str.trim() : "";
        if (!text) continue;

        const transform = item.transform ?? [];
        const rawX = Number(transform[4] ?? 0);
        const rawY = Number(transform[5] ?? 0);
        const width = positiveNumber(item.width) ?? Math.abs(Number(transform[0] ?? 0));
        const height = positiveNumber(item.height) ?? Math.abs(Number(transform[3] ?? 0));
        const fontSize = Math.max(Math.abs(Number(transform[0] ?? 0)), Math.abs(Number(transform[3] ?? 0))) || undefined;

        textItems.push({
          id: `pdfitem-${pageNumber}-${textItems.length + 1}`,
          pageNumber,
          text,
          x: round(rawX),
          y: round(viewport.height - rawY),
          width: round(width),
          height: round(height),
          fontName: item.fontName,
          fontSize: fontSize ? round(fontSize) : undefined
        });
      }
    }

    await pdf.destroy();

    return {
      textItems,
      diagnostics: {
        ...baseDiagnostics,
        pageCount: pdf.numPages,
        textItemCount: textItems.length,
        coordinateAvailable: textItems.length > 0,
        warnings: textItems.length ? baseDiagnostics.warnings : [...baseDiagnostics.warnings, "No PDF text coordinate items were extracted."]
      }
    };
  } catch (error) {
    return {
      textItems: [],
      diagnostics: {
        ...baseDiagnostics,
        warnings: [...baseDiagnostics.warnings, `Coordinate extraction failed: ${shortError(error)}`]
      }
    };
  }
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function shortError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 180) : String(error).slice(0, 180);
}
