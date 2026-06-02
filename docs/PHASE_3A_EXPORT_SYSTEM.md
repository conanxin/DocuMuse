# Phase 3A Export System

## Goal

Phase 3A adds a basic local export system for turning DocuMuse workspace results into reusable files. The first version supports Markdown and JSON exports. It does not generate real PPTX files, images, audio, or cloud-synced artifacts.

## Supported Export Content

The export system can include:

- Document metadata: title, filename, file type, created time, page count, text length, analysis status, analysis mode, provider, model, and analyzed time.
- Overview analysis: one-sentence summary, full summary, key points, keywords, document type, and language.
- Chinese translation or rewrite.
- Section analysis: section title, summary, key points, quotes, and source hint.
- Creative outputs: PPT outline, podcast script, and image prompts.
- Chunked analysis metadata and chunk summaries.
- Document chat history with short source quotes.

The export system intentionally does not include full extracted document text by default.

## API

```text
GET /api/documents/[id]/export
```

Query parameters:

```text
?format=markdown
?format=json
?includeChat=true
?includeCreative=true
?includeChunks=false
?only=chat
```

Defaults:

- `includeChat=true`
- `includeCreative=true`
- `includeChunks=false`

When `only=chat`, the response exports only the document Q&A record.

## Frontend Entry

The document workspace top bar now includes:

- Export Markdown
- JSON
- Q&A

Real documents call the server export endpoint. The demo document uses a small mock export so `/documents/demo` remains safe and usable.

## Security Filtering

Exports exclude:

- API keys.
- Full prompts.
- Raw model output.
- `analysisDiagnostics.rawPreview`.
- Full `document.text`.
- `data/settings`.
- Absolute local upload paths.

Exports may include:

- Provider name.
- Model name.
- Analysis mode and status.
- Short source quotes.
- Document filename and basic metadata.

## Current Limits

- No real PPTX file generation.
- No image generation.
- No audio generation.
- No cloud export or sync.
- No full original text export by default.
- Markdown output is report-oriented rather than layout-perfect.
- If analysis is missing, Markdown shows `尚未生成分析结果`.
- If chat history is empty, Q&A export shows `暂无问答记录`.

## Next Step

Phase 3B can add real PPTX generation from the exported outline after the Markdown and JSON export paths are stable.
