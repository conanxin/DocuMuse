# Phase 4D.3: PDF Preview Coordinate Calibration

Phase 4D.3 improves the experimental PDF preview overlay introduced in Phase 4D.2. It is still not a full PDF reader. The goal is to make source bounding-box display safer and easier to diagnose across different page sizes and zoom levels.

## Implemented

- Added `src/lib/pdfCoordinateMapping.ts` for explicit bounding-box to viewport conversion.
- Added coordinate-system handling for `viewport_top_left`, `pdf_bottom_left`, and `unknown`.
- Added scale-aware conversion from stored page coordinates to the rendered PDF viewport.
- Added safe clamping so overlay rectangles do not render outside the page.
- Added minimum visible overlay size for tiny bounding boxes.
- Added warning returns when coordinates are invalid, off-page, or cannot be safely displayed.
- Added basic zoom controls: `90%`, `100%`, `125%`, `150%`, `+`, and `-`.
- Added a collapsible overlay diagnostics panel with current page, zoom, coordinate system, viewport size, source page, confidence, raw bounding box, converted overlay box, and warning.
- Added user-facing hints that PDF preview and coordinate overlays are experimental.
- Added source-page mismatch handling: if a selected source belongs to another page, the overlay is hidden and the UI tells the user which page contains the source.
- Kept original text paragraph navigation as the primary reliable source positioning path.

## Coordinate Mapping Strategy

The current mapping assumes paragraph bounding boxes are stored in a page coordinate space that can be scaled into the current PDF viewport.

The conversion flow is:

1. Validate source bounding box values.
2. Determine page-to-viewport scale.
3. Flip Y when the source coordinate system is `pdf_bottom_left`.
4. Clamp the rectangle to the rendered page.
5. Enforce a minimum visible width and height.
6. Return a warning instead of rendering obviously invalid rectangles.

This is still best-effort. Complex crop boxes, rotated pages, unusual PDF coordinate systems, or multi-column text extraction may still produce offset overlays.

## Runtime Validation

Headless Microsoft Edge smoke validation passed with a local fixture document:

```text
PDF preview canvas at 100%: 612 x 792
Overlay at 100%: found
Overlay size at 100%: 540 x 62
PDF preview canvas at 150%: 918 x 1188
Overlay at 150%: found
Overlay size at 150%: 810 x 93
Diagnostics panel: found
```

The smoke test confirmed that canvas and overlay scale together when zoom changes.

## Security

- The PDF file API continues to read only the upload file associated with the current document.
- The API does not expose local absolute paths.
- Demo and missing documents return JSON errors.
- The PDF preview does not expose API keys, prompts, raw model output, settings files, or full document text.
- Existing Markdown, JSON, PPTX, and ZIP exports are not changed by this phase.

## Current Limitations

- No OCR.
- No full PDF reader.
- No continuous scroll.
- No thumbnail list.
- No PDF text search.
- No page canvas overlay editing.
- No image or table extraction.
- Coordinate overlays remain approximate and should be treated as a visual aid.
- Original-text paragraph anchors remain the more reliable fallback.

## Next Suggested Work

Phase 4D.4 adds the first local coordinate regression fixture baseline and validation script. Later fixture expansion should cover rotated PDFs, different page sizes, dense paragraphs, and multi-column documents before investing in a fuller PDF reader.
