# Phase 4A: Structured PDF Parsing

Phase 4A upgrades DocuMuse's selectable-text PDF parsing from a single `text` field into a structured local document model.

## Scope

Implemented:

- Keep the existing `document.text` field for backward compatibility.
- Add structured `pages`, `paragraphs`, `sections`, and `parseDiagnostics` fields for new uploads.
- Add runtime fallback structure generation for older document JSON files.
- Prefer structured paragraphs in lightweight document chat retrieval.
- Add paragraph/page metadata to chat sources.
- Prefer paragraph source IDs when locating chat citations in the original text panel.
- Render the original text as paragraph cards with page, paragraph, section, and diagnostics metadata.
- Show real detected sections in the workspace sidebar when available.
- Prefer paragraph-aware chunks for full document analysis.

Not implemented:

- OCR for scanned PDFs.
- PDF coordinate extraction.
- Table parsing.
- Image extraction.
- EPUB / Word parsing.
- LLM changes.
- Export system rewrites.

## Stored Fields

New uploaded documents can include:

```ts
pages?: ParsedPage[];
paragraphs?: ParsedParagraph[];
sections?: ParsedSection[];
parseDiagnostics?: ParseDiagnostics;
```

The original `text` field remains the canonical plain-text fallback and is still used by existing export and analysis code.

## Backward Compatibility

Older documents without structured fields are handled by `ensureDocumentStructure(document)`.

This fallback:

- Generates pages, paragraphs, sections, and diagnostics at runtime.
- Does not mutate or write back old JSON files.
- Allows chat, source navigation, original text reading, and chunked analysis to keep working.

## Parsing Heuristics

Current structure generation is heuristic-based:

- Pages are derived from PDF parser page count or form-feed markers when available.
- Paragraphs are split by blank lines first, with long paragraphs split into smaller readable anchors.
- Sections are detected from common Chinese and English headings such as `摘要`, `引言`, `结论`, `Abstract`, `Introduction`, and numbered headings.
- Diagnostics record text length, page count, paragraph count, section count, empty page count, and scanned-PDF suspicion.

## Source Positioning

Chat sources now prefer:

1. `paragraphId`
2. `anchorId`
3. `startChar` / `endChar`
4. quote fallback

This improves citation navigation while preserving old chat records.

## Current Limitations

- Source positioning is still text-based, not PDF-coordinate based.
- Page boundaries may be approximate when the PDF parser does not expose reliable per-page text.
- Section detection is heuristic and may miss unconventional headings.
- Scanned PDFs still require OCR in a later phase.

## Validation

Run:

```bash
npm.cmd run build
```

Manual checks:

- Upload a selectable-text PDF and confirm the saved JSON includes `pages`, `paragraphs`, `sections`, and `parseDiagnostics`.
- Open old documents without these fields and confirm the workspace still loads.
- Ask a document question and confirm sources include page / paragraph hints.
- Click a source and confirm the original text panel highlights the paragraph.
- Run quick/full analysis and confirm chunking still works.
- Confirm Markdown / JSON / PPTX / ZIP exports still build from the existing safe export layer.
