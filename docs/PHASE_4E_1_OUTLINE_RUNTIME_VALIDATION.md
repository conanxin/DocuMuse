# Phase 4E.1: Outline Runtime Validation

Phase 4E.1 validates the outline extraction path with a newly uploaded selectable-text PDF fixture.

This phase does not add LLM features, OCR, EPUB / Word support, or new PDF viewer behavior.

## Runtime Fixture

Fixture:

```text
.tools/test-fixtures/outline/structured-headings.pdf
```

The PDF contains visible headings:

- `摘要`
- `引言`
- `1. Introduction`
- `1.1 Background`
- `2. Method`
- `3. Results`
- `Conclusion`
- `References`

It is generated locally through Edge headless printing from `structured-headings.html`.

## Upload Result

Runtime upload through:

```text
POST /api/documents/upload
```

Validation document:

```text
doc_8aa70056-5037-49d3-89c0-215c9b7f2038
```

Observed structure:

- `pages`: 2
- `paragraphs`: 3
- `outlineNodeCount`: 8
- `maxDepth`: 2
- `detectedAbstract`: true
- `detectedIntroduction`: true
- `detectedConclusion`: true
- `detectedReferences`: true

Detected nodes:

- `摘要`
- `引言`
- `1 Introduction`
- `1.1 Background`
- `2 Method`
- `3 Results`
- `Conclusion`
- `References`

## Bug Fixes

The runtime fixture exposed that browser-printed PDFs can merge many headings and body paragraphs into a few large extracted paragraphs.

Fixes added:

- Inline heading candidate detection inside merged paragraphs.
- Stricter keyword boundary handling to avoid treating body text such as lower-case `conclusion` as a heading.
- Source retrieval now prefers outline range chunks when an outline is available.
- Query scoring now boosts direct outline-title matches.

## Sidebar And Original Text

The workspace sidebar now prefers `document.outline` and can show nested outline nodes with level and type labels.

Original-text paragraph cards can mark heading paragraphs with a visible outline heading tag. If multiple headings are merged into one extracted paragraph, clicking an outline node still highlights that paragraph as a best-effort fallback.

## Source Metadata

Lightweight document search now returns outline-aware sources when available:

- `outlineNodeId`
- `outlineTitle`
- `outlineType`
- page number
- paragraph id

Example source hint:

```text
第 1 页 · 1 Introduction · 第 1 段
```

No real LLM call was required for this validation.

## Chunking

Full-analysis chunking can now emit outline-aware chunk metadata:

- `outlineNodeId`
- `outlineTitle`
- `startPage`
- `endPage`
- `paragraphIds`

The runtime fixture produced outline-aware chunk metadata for the detected headings.

## Export Compatibility

Runtime export endpoints returned 200 for:

- `format=json`
- `format=markdown`
- `format=pptx`
- preset ZIP export

JSON export includes safe `outline` and `outlineDiagnostics` and does not include the full `text` field.

## Compatibility Notes

- Older documents without stored `outline` still open through `ensureDocumentStructure(document)` fallback.
- Documents with no detectable headings fall back to sections or mock/demo outline UI.
- The current outline extraction remains heuristic and best-effort.

## Limitations

- Merged PDF text can still reduce precise heading-level source positioning.
- Complex multi-column layouts, rotated pages, CropBox / MediaBox differences, and scanned PDFs remain out of scope.
- Browser plugin automation was unavailable in this run, so UI click behavior should still be visually checked in the local browser.
