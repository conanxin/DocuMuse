# Phase 3C Export Presets

## Goal

Phase 3C adds reusable export presets for common DocuMuse workflows. Presets combine existing export endpoints into a small local download plan. The first version uses browser multi-file download and does not create ZIP files.

This phase does not call an LLM, generate images, create audio, use RAG, use embeddings, add cloud sync, or change API key storage.

## Presets

### 学习笔记包

Files:

- Markdown analysis report.
- Q&A Markdown.

Use case: personal study notes and review.

### 汇报材料包

Files:

- PPTX.
- Markdown analysis report.

Default PPTX options:

- `theme=blue`
- `cover=report`
- Summary, key points, keywords, sections, and outline included.
- Creative outputs and chat excluded.

Use case: meeting, class, or internal presentation.

### 研究摘录包

Files:

- Markdown analysis report.
- JSON structured export.
- Q&A Markdown.

Use case: research retention and source-aware review.

### 播客准备包

Files:

- Markdown analysis report.

Use case: podcast preparation. The first version uses the ordinary Markdown report; future phases can add a podcast-focused Markdown format.

### 完整归档包

Files:

- Markdown analysis report.
- JSON structured export.
- PPTX.
- Q&A Markdown.

Use case: full local archival export.

## API

New route:

```text
GET /api/documents/[id]/export/presets
```

Response:

```json
{
  "ok": true,
  "presets": []
}
```

The response includes preset labels, descriptions, and a list of safe file URLs. It does not return full document text, API keys, prompts, raw model output, or local absolute paths.

## Frontend Behavior

The workspace top bar now includes `导出预设`.

Clicking it opens a dialog with five preset cards. When the user exports a preset, the frontend downloads each file through existing export routes with a short delay between files.

If the browser blocks multiple downloads, the UI asks the user to allow multiple downloads for the site.

## Security

Preset files reuse existing safe export endpoints. They do not include:

- API keys.
- Prompts.
- Raw model output.
- Full original document text.
- `data/settings`.
- Absolute `uploadPath`.
- `analysisDiagnostics.rawPreview`.

## Current Limits

- No ZIP packaging.
- No cloud sync.
- No saved custom user presets.
- No preset-specific podcast Markdown yet.
- Demo documents do not use real preset exports.
