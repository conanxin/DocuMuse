# Phase 4D.1: Coordinate-Aware Source UI

Phase 4D.1 adds a lightweight coordinate-aware source interface on top of the Phase 4D.0 PDF text-layer coordinate foundation.

This phase does not implement a PDF viewer, canvas rendering, or coordinate overlay highlighting. It only exposes coordinate metadata in the existing chat source cards and original text reader so future PDF-page positioning work has a visible and testable UI path.

## Implemented

- Chat source cards now show coordinate status:
  - `页面区域已定位`
  - `页面区域近似定位`
  - `暂无页面坐标`
- Chat source cards can show page number, confidence, and bounding box details when available.
- Chat source cards support copying lightweight location information.
- Original text paragraph cards show coordinate status tags when paragraph positions exist.
- Original text paragraph cards can expand coordinate details:
  - page number
  - confidence
  - bounding box
- Original text diagnostics now include:
  - PDF coordinate layer availability
  - text item count
  - positioned paragraph count
  - unpositioned paragraph count
  - coordinate positioning rate
- Documents without coordinate fields continue to work through paragraph-only fallback.

## Source Metadata

Coordinate-aware sources can include:

```ts
{
  pageNumber?: number;
  paragraphId?: string;
  coordinateAvailable?: boolean;
  coordinateConfidence?: "high" | "medium" | "low";
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

## Copy Location Format

The source card can copy a compact location note:

```text
第 3 页 · 第 12 段
坐标：x=120.4, y=238.1, width=320.0, height=42.5
confidence=medium
```

This is intended for debugging, future viewer work, and manual source inspection. It does not expose API keys, prompts, raw model output, full document text, or PDF binary content.

## JSON Export Compatibility

The safe JSON export keeps coordinate export conservative:

- Includes `coordinateDiagnostics`.
- Includes summarized `paragraphPositions`.
- Does not export full `pdfTextItems`.
- Does not export full `document.text`.
- Does not export PDF binary content.

## Follow-Up Viewer Spike

Phase 4D.2 uses the same coordinate metadata to support an experimental `PDF 预览` tab:

- `GET /api/documents/[id]/file` returns the uploaded PDF for the current document.
- Coordinate-aware source cards can open the selected source in the PDF preview.
- The preview renders one PDF page and draws a best-effort bounding-box overlay.

The original text reader remains the default and more reliable source navigation path.

## Dependency Note

`pdfjs-dist@5.4.296` is pinned as a direct dependency so the coordinate extractor does not rely only on transitive resolution through `pdf-parse`.

## Current Limitations

- Coordinates are best-effort and approximate.
- No full PDF viewer.
- No PDF page canvas rendering.
- No coordinate overlay highlight.
- No OCR for scanned PDFs.
- Complex layouts, rotated text, tables, and multi-column PDFs may still produce partial or low-confidence positioning.
