# Phase 4E: Outline Extraction And Chapter Structure

Phase 4E adds a lightweight document outline layer on top of the structured PDF parsing pipeline.

This phase does not call an LLM, does not perform OCR, and does not introduce machine-learning heading detection. It uses deterministic heading heuristics over extracted paragraphs.

## Goals

- Detect common Chinese and English chapter / section headings.
- Persist a hierarchical outline for newly uploaded PDFs.
- Runtime-generate an outline fallback for older documents.
- Prefer outline boundaries for full-analysis chunking.
- Attach outline metadata to chat sources and paragraph anchors.
- Improve workspace sidebar navigation for real uploaded documents.

## Outline Schema

New document JSON can include:

```ts
outline?: DocumentOutlineNode[];
outlineDiagnostics?: OutlineDiagnostics;
```

Each outline node stores:

- `id`
- `title`
- `level`
- `index`
- `pageNumber`
- `startParagraphId`
- `endParagraphId`
- `startChar`
- `endChar`
- `parentId`
- `children`
- `confidence`
- `type`

## Heuristic Detection

The extractor currently recognizes:

- Chinese headings such as `摘要`, `引言`, `结论`, `参考文献`, `附录`.
- Chinese numbered patterns such as `第 1 章`, `第 1 节`, `一、`, `（一）`.
- Numeric headings such as `1.`, `1.1`, `1.1.1`.
- English headings such as `Abstract`, `Introduction`, `Conclusion`, `References`, `Appendix`.
- Short uppercase English headings.
- Inline heading candidates inside larger extracted paragraphs, which can happen when PDF text extraction merges visible headings and body text together.

Ranges are inferred from each heading paragraph until the next heading at the same or higher level.

## UI Changes

- Workspace sidebar now prefers `document.outline`.
- Outline nodes are indented by level and can jump to the original-text paragraph.
- Original-text paragraph cards can mark outline heading paragraphs.
- Chat source cards can show outline title metadata.

## Analysis And Retrieval

- Lightweight chat retrieval attaches `outlineNodeId`, `outlineTitle`, and `outlineType` when available.
- Source hints can include page, outline title, and paragraph context.
- Full-analysis chunking prefers outline boundaries before falling back to paragraph chunking.
- Chunk metadata can include `outlineNodeId` and `outlineTitle`.

## Export Compatibility

- JSON export includes safe outline and outline diagnostics.
- Markdown export can include a document outline section.
- PPTX and ZIP exports continue to use the existing safe exporters.
- Full document text, API keys, prompts, raw output, and local settings paths are not exported.

## Limitations

- Heading detection is heuristic and may miss unusual layouts.
- This does not infer semantic topics beyond visible heading text.
- Multi-column, rotated, CropBox / MediaBox, and scanned PDFs still need separate validation.
- OCR, EPUB, and Word parsing remain out of scope.

## Validation Notes

Run:

```bash
npm run build
```

Recommended manual checks:

- Upload a selectable-text PDF with clear headings.
- Confirm document JSON contains `outline` and `outlineDiagnostics`.
- Confirm sidebar shows detected outline nodes.
- Click an outline node and confirm the original-text view highlights the heading paragraph.
- Ask a document question and confirm source metadata can include outline context.
- Run full analysis and confirm chunk metadata can include outline node fields.
- Export Markdown / JSON / PPTX / ZIP and confirm no sensitive fields are leaked.

Phase 4E.1 runtime validation used `.tools/test-fixtures/outline/structured-headings.pdf` and confirmed upload-time outline extraction for merged-heading PDF text.

Phase 4E.2 adds `npm run test:outline`, which generates four Chinese / English near-real PDF fixtures and validates outline extraction without LLM calls.
