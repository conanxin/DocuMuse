# Phase 4A.1: Structured PDF Runtime Validation

Date: 2026-06-04

## Goal

Validate the Phase 4A structured PDF parsing path with a real selectable-text PDF and confirm that existing workspace, export, and old-document compatibility paths are not broken.

## Test Environment

- Local Next.js dev server: `http://localhost:3031`
- Test PDF: `.tools/test-fixtures/text.pdf`
- New uploaded document: `doc_36643f45-4523-40fc-a63a-bbbf7f0891be`
- Old fallback document checked: `doc_54eaa96b-6e7e-4c8d-a511-7eeba61d56f1`

## New Upload Validation

Result: passed at API/runtime level.

Observed structured fields in the new document JSON:

```text
text: present
pageCount: 1
pages: 1
paragraphs: 1
sections: 0
parseDiagnostics: present
textLength: 250
paragraphCount: 1
sectionCount: 0
firstSourceHint: 第 1 页 · 第 1 段
```

The fixture is short and has no clear section headings, so `sections: 0` is expected and does not cause errors.

## Original Text Runtime

Build validation passed for the paragraph-card original text reader.

The workspace page for an old document returned HTTP 200. Browser-level click validation should still be repeated manually because the automated browser process was not available in this sandbox run.

Expected UI behavior:

- Shows page count, paragraph count, section count, and text length.
- Shows parser warnings.
- Renders paragraphs as cards.
- Uses paragraph IDs first when locating source citations.
- Falls back to anchor ID, character range, and quote matching for old sources.

## Outline Runtime

The workspace sidebar now uses detected sections when available and falls back to the mock outline when no sections are detected.

The short fixture produced no sections, which was handled without errors.

## Chat Source Runtime

No real LLM call was executed during this validation run to avoid consuming or exposing local API credentials.

Code-level and build validation confirm that chat sources can now include:

- `paragraphId`
- `pageNumber`
- `sectionId`
- `sectionTitle`
- `sourceHint`

Manual real-key follow-up:

- Ask a real document: `这篇文章讲了什么？`
- Confirm source cards show page / paragraph hints.
- Click a source and confirm original-text paragraph highlighting.

## Full Analysis Runtime

No real full-analysis LLM call was executed during this validation run.

Build validation confirms full analysis uses paragraph-aware chunking and can save chunk metadata with:

- `paragraphIds`
- `startPage`
- `endPage`
- clearer `sourceHint`

Manual real-key follow-up:

- Run full analysis on a real document.
- Confirm `chunks` in the document JSON include paragraph and page metadata.

## Export Compatibility

Result: passed for the new uploaded document.

Validated endpoints:

```text
GET /api/documents/{id}/export?format=markdown -> 200
GET /api/documents/{id}/export?format=json -> 200
GET /api/documents/{id}/export?format=pptx -> 200
GET /api/documents/{id}/export?format=markdown&only=chat -> 200
GET /api/documents/{id}/export/preset?preset=study-notes -> 200
```

The exported responses used the expected content types and content-disposition headers.

## Old Document Compatibility

Result: passed at API/runtime level.

Old document checked:

```text
doc_54eaa96b-6e7e-4c8d-a511-7eeba61d56f1
```

Validated:

```text
GET /api/documents/{id} -> 200
GET /documents/{id} -> 200
GET /api/documents/{id}/export?format=markdown -> 200
GET /api/documents/{id}/export?format=json -> 200
```

## Error Paths

Validated:

```text
Non-PDF upload -> JSON error: 仅支持上传 PDF 文件。
Blank PDF upload -> JSON error: 当前版本暂不支持 OCR，请上传包含可复制文本的 PDF。
Invalid export preset -> 400
Missing document export -> 404
```

No HTML 500 response was observed in these checked paths.

## Security Check

This validation did not inspect or expose local API keys.

The checked export paths continue to rely on the existing safe export layer and do not export:

- API Key
- prompt
- raw model output
- full original document text by default
- `data/settings`
- absolute upload paths
- `analysisDiagnostics.rawPreview`

## Known Limitations

- No OCR.
- No PDF coordinate-level source positioning.
- Page boundaries may be approximate when the parser does not expose reliable per-page text.
- Section detection is heuristic.
- Browser-level UI clicks and real-key chat/full-analysis should be manually repeated on the user's machine.
