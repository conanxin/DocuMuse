# Phase 4D.2: PDF Viewer Feasibility Spike

Phase 4D.2 validates a minimal loop from stored PDF files to single-page canvas rendering and coordinate-region overlay.

This is an experimental viewer spike. It does not replace the original text reader.

## Implemented

- Added `GET /api/documents/[id]/file`.
- Added local pdfjs module / worker helper routes:
  - `GET /api/pdf-module`
  - `GET /api/pdf-worker`
- The file API returns only the uploaded PDF associated with the current document.
- Added an experimental `PDF 预览` workspace tab.
- Added single-page PDF canvas rendering with `pdfjs-dist`.
- Added previous / next page controls.
- Added a lightweight absolute overlay layer above the canvas.
- When a selected source has `boundingBox`, the preview draws a translucent highlighted region.
- Chat source cards with coordinate metadata now show `在 PDF 中查看`.
- Clicking `在 PDF 中查看` switches to the PDF preview tab and opens the source page.
- Existing source click behavior still opens the original text reader and highlights the paragraph.

## Security

- The file API validates document ids.
- The file API only reads the upload path stored for the current document.
- Upload paths are resolved under `data/uploads/`.
- The API does not return local absolute paths.
- Demo documents without real PDFs return JSON errors.
- Missing documents or missing PDF files return JSON 404.
- No API keys, prompts, raw model output, or settings files are exposed.

## Coordinate Mapping

`paragraphPositions.boundingBox` values are currently mapped to the rendered PDF viewport with a simple scale-based conversion:

```ts
convertBoundingBoxToViewportBox(boundingBox, viewport)
```

This is best-effort. It is enough to validate the data path, but it may be offset for complex PDFs, rotated pages, unusual crop boxes, multi-column layouts, or coordinate systems that differ from the assumed scale-1 viewport.

## Validation

API-level validation passed with an existing fixture document:

```text
GET /api/documents/{id}/file
status: 200
content-type: application/pdf
```

Error-path validation:

```text
GET /api/documents/demo/file
status: 404
content-type: application/json

GET /api/documents/doc_missing/file
status: 404
content-type: application/json
```

`npm.cmd run build` passed.

Browser smoke validation passed with local Microsoft Edge:

```text
PDF preview canvas: 826 x 1069
Full-page pixel scan: non-white PDF content detected
PDF source action: clicked "在 PDF 中查看"
Overlay: found
Overlay size: 729 x 84
```

The temporary validation document used for the overlay click test was deleted after the test.

## Current Limitations

- No OCR.
- No full PDF reader.
- No thumbnails.
- No search.
- No zoom controls beyond the fixed render scale.
- No continuous scrolling.
- No PDF annotation layer.
- Overlay boxes are approximate and may be visually offset.
- The preview loads pdfjs through local module / worker API routes to avoid Next.js worker bundling issues.
