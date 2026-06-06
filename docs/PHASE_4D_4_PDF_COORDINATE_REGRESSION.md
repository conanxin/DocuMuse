# Phase 4D.4: PDF Coordinate Regression Fixtures

Phase 4D.4 adds a lightweight regression baseline for PDF coordinate extraction, paragraph mapping, preview overlay rendering, and zoom synchronization.

This phase does not expand the PDF preview into a full PDF reader. It focuses on repeatable checks and documentation for the coordinate path introduced in Phase 4D.0 through Phase 4D.3.

## Fixture Directory

Fixtures live in:

```text
.tools/test-fixtures/pdf-coordinate/
```

Current Phase 4D.5 fixture coverage:

| Fixture | Status | Purpose |
| --- | --- | --- |
| `simple-one-page.pdf` | present | Baseline selectable-text PDF for text item extraction, paragraph position mapping, and overlay smoke testing. |
| `simple-multipage.pdf` | active | Page navigation and source-page routing. |
| `dense-paragraphs.pdf` | active | Paragraph mapping across denser text blocks. |
| `two-column.pdf` | active | Lightweight two-column text extraction and bounding-box checks. |

The first fixture is intentionally small and was copied from `.tools/test-fixtures/text.pdf`.

## Coordinate Validation Script

Run:

```bash
npm run test:pdf-coordinates
```

The script validates available fixture PDFs by checking:

- text item extraction returns at least one item
- coordinate diagnostics are effectively available
- paragraph-like text groups can be built
- paragraph positions can be generated
- at least one bounding box exists
- bounding box values are finite
- bounding box width and height are positive

Expected current output after Phase 4D.5:

```text
[passed] simple-one-page.pdf ...
[passed] simple-multipage.pdf ...
[passed] dense-paragraphs.pdf ...
[passed] two-column.pdf ...
[pending] mixed-page-size.pdf ...
[pending] rotated-page.pdf ...
[pending] cropbox-mediabox.pdf ...
Summary: 4 passed, 3 pending, 0 failed.
```

Pending planned fixtures do not fail the script. A failure in any active fixture fails the script.

## Overlay Smoke Test

Phase 4D.3 smoke testing used a temporary local document with a coordinate-aware chat source.

Manual or headless validation flow:

1. Start the dev server:

   ```bash
   npm run dev -- -p 3031
   ```

2. Open a document with an uploaded PDF and coordinate-aware source metadata.

3. In the chat source area, click `在 PDF 中查看`.

4. Confirm:

   - the workspace switches to `PDF 预览`
   - the PDF canvas renders
   - a translucent overlay rectangle appears
   - the diagnostics panel exists
   - zooming from `100%` to `150%` changes both canvas and overlay dimensions

5. Treat visible overlay offset as a regression signal only when the source text and expected PDF location are known. Current positioning is approximate.

## Latest Smoke Result

Headless Microsoft Edge validation passed:

```text
PDF preview canvas at 100%: 612 x 792
Overlay at 100%: found
Overlay size at 100%: 540 x 62
PDF preview canvas at 150%: 918 x 1188
Overlay at 150%: found
Overlay size at 150%: 810 x 93
Diagnostics panel: found
```

## Not Covered Yet

- Rotated pages.
- CropBox / MediaBox mismatches.
- Mixed page sizes.
- Multi-column complex layouts.
- Scanned PDFs without selectable text.
- Image-heavy PDFs.
- Table-heavy PDFs.

## Security And Compatibility

- The regression script reads only local fixtures.
- It does not call LLMs.
- It does not read API settings.
- It does not export API keys, prompts, raw model output, or full document text.
- Markdown, JSON, PPTX, and ZIP export behavior is unchanged by this phase.

## Next Suggested Work

Add real `simple-multipage.pdf` and `dense-paragraphs.pdf` fixtures, then extend the script to validate page-specific bounding boxes and multiple paragraph positions.
