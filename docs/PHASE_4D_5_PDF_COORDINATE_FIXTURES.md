# Phase 4D.5: Expanded PDF Coordinate Fixtures

Phase 4D.5 expands the local PDF coordinate regression fixture set. It does not expand the PDF preview into a full reader.

## Goals

- Cover more coordinate extraction scenarios with small local PDFs.
- Keep fixtures lightweight and reproducible.
- Validate page counts, text item extraction, paragraph-like position mapping, distinct page numbers, and bounding-box validity.
- Keep pending scenarios explicit instead of pretending they are covered.

## Fixture Directory

```text
.tools/test-fixtures/pdf-coordinate/
```

## Active Fixtures

| Fixture | Purpose | Current Result |
| --- | --- | --- |
| `simple-one-page.pdf` | Basic coordinate extraction | passed |
| `simple-multipage.pdf` | Multi-page source navigation and page number extraction | passed |
| `dense-paragraphs.pdf` | Dense paragraph coordinate mapping | passed |
| `two-column.pdf` | Lightweight two-column text extraction | passed |

## Pending Fixtures

| Fixture | Purpose |
| --- | --- |
| `mixed-page-size.pdf` | Different page sizes in one document |
| `rotated-page.pdf` | True rotated page coordinate handling |
| `cropbox-mediabox.pdf` | CropBox / MediaBox mismatch handling |

## Generation

Run:

```bash
npm run generate:pdf-coordinate-fixtures
```

The generator uses local Microsoft Edge headless printing from small HTML templates. It does not download resources and does not call external services.

Generated fixtures:

- `simple-multipage.pdf`
- `dense-paragraphs.pdf`
- `two-column.pdf`

`simple-one-page.pdf` is retained from the existing small text fixture.

## Validation

Run:

```bash
npm run test:pdf-coordinates
```

The validation script reads `manifest.json` and checks active fixtures for:

- file existence
- expected minimum page count
- expected minimum text item count
- expected minimum paragraph count
- expected minimum distinct page count when configured
- finite `x`, `y`, `width`, and `height`
- non-negative `x` and `y`
- positive `width` and `height`

Latest result:

```text
[passed] simple-one-page.pdf pages=1 distinctPages=1 textItems=3 paragraphs=3 positioned=3
[passed] simple-multipage.pdf pages=3 distinctPages=3 textItems=21 paragraphs=21 positioned=21
[passed] dense-paragraphs.pdf pages=2 distinctPages=2 textItems=57 paragraphs=57 positioned=57
[passed] two-column.pdf pages=1 distinctPages=1 textItems=45 paragraphs=45 positioned=45
[pending] mixed-page-size.pdf
[pending] rotated-page.pdf
[pending] cropbox-mediabox.pdf

Summary: 4 passed, 3 pending, 0 failed.
```

## Overlay Regression

Phase 4D.4 documented the headless Edge overlay smoke test. The same smoke path remains valid:

1. Create or open a document with coordinate-aware source metadata.
2. Click `在 PDF 中查看`.
3. Confirm PDF canvas renders.
4. Confirm overlay appears.
5. Confirm 100% and 150% zoom keep canvas and overlay synchronized.

## Not Covered Yet

- OCR.
- Full PDF reader behavior.
- Continuous scroll.
- Thumbnail navigation.
- PDF text search.
- True PDF rotation dictionaries.
- CropBox / MediaBox mismatch.
- Mixed page-size documents.
- Image-heavy or table-heavy PDFs.

## Notes

The current fixtures are intentionally small. They validate the coordinate data path and catch obvious regressions, but they do not guarantee pixel-perfect overlay placement for complex production PDFs.
