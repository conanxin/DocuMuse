# Phase 3A.1 Export Runtime Validation

## Goal

Phase 3A.1 validates and hardens the basic export system added in Phase 3A. The scope is limited to Markdown, JSON, and Q&A export behavior.

## Export API Checks

Target endpoints:

```text
GET /api/documents/{id}/export?format=markdown
GET /api/documents/{id}/export?format=json
GET /api/documents/{id}/export?format=markdown&only=chat
```

Expected behavior:

- Markdown exports return `text/markdown; charset=utf-8`.
- JSON exports return `application/json; charset=utf-8`.
- All successful exports return `Content-Disposition: attachment`.
- Missing documents return JSON 404.
- Unsupported formats return JSON 400.
- Errors return JSON, not HTML 500.

## Browser Download Checks

Workspace top bar actions:

- `导出 Markdown`
- `JSON`
- `问答`

Expected behavior:

- Buttons trigger a file download for real documents.
- Buttons show disabled/loading state while exporting.
- Errors are shown in the workspace.
- Demo document export uses mock content and does not crash.

## Empty States

- If analysis has not been generated, Markdown shows `尚未生成分析结果`.
- If chat history is empty, chat export shows `暂无问答记录`.
- Missing optional analysis fields should not produce `undefined` or `null` in Markdown.

## Security Filtering

Exports must not include:

- API keys.
- Full prompts.
- Raw model output.
- `analysisDiagnostics.rawPreview`.
- Full `document.text`.
- Full chunk text.
- `data/settings`.
- Local absolute upload paths.

Exports may include:

- Provider name.
- Model name.
- Analysis mode and status.
- Short source quotes.
- Basic document metadata.

## Known Runtime Constraint

In the current Codex sandbox, launching a background Next.js dev server can be blocked by process sandboxing. When this happens, API behavior should still be validated through build output, static checks, and user-side browser testing on a locally running dev server.

## Phase 3A.1 Validation Result

Build result:

- `npm.cmd run build`: passed.

API handler validation:

- `format=markdown`: passed with status `200`, `text/markdown; charset=utf-8`, and attachment filename.
- `format=json`: passed with status `200`, `application/json; charset=utf-8`, attachment filename, and parseable JSON.
- `format=markdown&only=chat`: passed with status `200`, `text/markdown; charset=utf-8`, and chat export filename.
- Missing document: returned JSON `404`.
- Unsupported format: returned JSON `400`.

Content filtering checks:

- No API key-like token found.
- No `analysisDiagnostics.rawPreview` in export output.
- No full `text` field in JSON export.
- No `undefined` or `null` in Markdown export.
- Empty chat export includes `暂无问答记录`.

Browser download validation:

- Not completed in the sandbox because background dev server launch was blocked.
- To validate manually, run `npm.cmd run dev -- -p 3031`, open a real document workspace, and click `导出 Markdown`, `JSON`, and `问答`.
