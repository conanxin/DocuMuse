# Phase 3C Export Presets

## Goal

Phase 3C adds reusable export presets for common DocuMuse workflows. Presets combine existing export endpoints into local export packages.

Phase 3C initially used browser multi-file download. Phase 3C.1 upgrades presets to server-generated ZIP download.

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

## APIs

Preset list:

```text
GET /api/documents/[id]/export/presets
```

Preset ZIP:

```text
GET /api/documents/[id]/export/preset?preset={presetId}
```

The preset list response includes labels, descriptions, and safe file URLs. It does not return full document text, API keys, prompts, raw model output, or local absolute paths.

## Frontend Behavior

The workspace top bar includes `导出预设`.

Clicking it opens a dialog with five preset cards. Since Phase 3C.1, each preset downloads one ZIP file through `/api/documents/[id]/export/preset`.

Existing single-file Markdown, JSON, PPTX, and chat exports remain available as fallback actions.

## Security

Preset exports reuse existing safe exporters. They do not include:

- API keys.
- Prompts.
- Raw model output.
- Full original document text.
- `data/settings`.
- Absolute `uploadPath`.
- `analysisDiagnostics.rawPreview`.

## Current Limits

- No cloud sync.
- No saved custom user presets.
- No user-selected ZIP file list.
- No preset-specific podcast Markdown yet.
- Demo documents do not use real preset exports.
