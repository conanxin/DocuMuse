# Phase 4D.0: PDF Text-Layer Coordinate Extraction

Phase 4D.0 adds a best-effort PDF text-layer coordinate extraction path as groundwork for future coordinate-aware source positioning.

## Scope

Implemented:

- Extract PDF text item coordinates with `pdfjs-dist`.
- Store lightweight text item boxes for new uploads.
- Map structured paragraphs to approximate PDF page regions.
- Store coordinate diagnostics.
- Add coordinate metadata to chat/source objects.
- Show coordinate availability in the original text diagnostics panel.
- Show paragraph coordinate status tags in the original text reader.
- Export safe coordinate diagnostics and paragraph position summaries in JSON export.

Not implemented:

- OCR.
- Full PDF viewer.
- Coordinate-region visual highlighting.
- PDF image parsing.
- Table recognition.
- EPUB / Word parsing.
- LLM changes.

## Data Fields

New optional document fields:

```ts
pdfTextItems?: PdfTextItemBox[];
paragraphPositions?: PdfParagraphPosition[];
coordinateDiagnostics?: PdfCoordinateDiagnostics;
```

All fields are optional. Old documents without them remain compatible.

## Coordinate System

Coordinates are extracted from `pdfjs-dist` viewport coordinates at scale `1`, using a top-left origin conversion.

This is suitable for storing approximate page regions and future viewer work, but it is not yet a complete PDF rendering or highlighting system.

## Paragraph Mapping

Paragraph-to-coordinate mapping is heuristic:

1. Normalize paragraph text and text item strings.
2. Try continuous page text matching.
3. Fall back to token overlap.
4. Fall back to approximate page-level matching.

Confidence levels:

- `high`: continuous or strong item match.
- `medium`: small text item match.
- `low`: approximate page or overlap match.

## Runtime Validation

Validated with `.tools/test-fixtures/text.pdf`:

```text
coordinateAvailable: true
textItemCount: 3
positionedParagraphCount: 1
unpositionedParagraphCount: 0
pdfTextItems: 3
paragraphPositions: 1
firstConfidence: high
firstBoundingBox: present
```

JSON export validation:

- Includes `coordinateDiagnostics`.
- Includes safe `paragraphPositions` summary.
- Does not export full `pdfTextItems`.
- Does not export PDF binary content.
- Does not export full `document.text`.

## Compatibility

Coordinate extraction is an enhancement step. If it fails, upload still succeeds and `coordinateDiagnostics` records `coordinateAvailable: false` plus warnings.

## Follow-Up UI

Phase 4D.1 exposes this coordinate metadata in the product UI:

- Chat source cards show coordinate availability and confidence.
- Source cards can copy page-region location information.
- Original text paragraph cards can expand bounding-box details.
- Original text diagnostics show coordinate positioning rate.

`pdfjs-dist@5.4.296` is pinned as a direct dependency.

## Current Limitations

- Coordinates are approximate and best-effort.
- No PDF page rendering UI.
- No coordinate highlight overlay yet.
- Complex PDFs may produce incomplete or low-confidence mappings.
- Scanned PDFs still require OCR in a later phase.
