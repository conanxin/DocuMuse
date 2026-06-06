# PDF Coordinate Fixtures

This directory contains small local PDFs used to validate DocuMuse PDF coordinate extraction and preview overlay behavior.

Keep fixtures small. Do not add large or proprietary PDFs.

## Current Fixtures

### `simple-one-page.pdf`

- Source: copied from `.tools/test-fixtures/text.pdf`.
- Purpose: baseline selectable-text PDF for coordinate extraction, paragraph mapping, and overlay smoke tests.
- Expected behavior:
  - `pdfjs-dist` can extract text items.
  - At least one paragraph position can be generated.
  - At least one bounding box is finite and positive.

## Planned Fixtures

### `simple-multipage.pdf`

- Purpose: page navigation and source-page routing.
- Status: not committed yet.
- Note: add manually or generate with a lightweight script when a stable local PDF generation path is available.

### `dense-paragraphs.pdf`

- Purpose: paragraph mapping across multiple text blocks.
- Status: not committed yet.
- Note: add manually or generate with a lightweight script when a stable local PDF generation path is available.

## Not Covered Yet

- Rotated pages.
- CropBox / MediaBox mismatch.
- Multi-column complex layout.
- Scanned PDFs without selectable text.
- Image-heavy or table-heavy PDFs.

These cases should be added in later coordinate regression phases.
