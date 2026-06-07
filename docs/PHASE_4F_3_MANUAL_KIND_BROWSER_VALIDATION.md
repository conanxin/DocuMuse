# Phase 4F.3: Manual Document Kind Browser Validation

Phase 4F.3 validates the manual document-kind override workflow from the workspace UI through persistence, prompt routing, and exports.

## Scope

- No LLM feature changes.
- No OCR, EPUB, Word, PDF viewer, or ML classifier work.
- No API key logic changes.
- No large refactor.

## Browser Validation Status

The in-app browser control was unavailable in this run because the local browser-control runtime could not start inside the current sandbox.

Instead, this phase completed runtime-equivalent validation against the same API handlers and export builders used by the browser UI.

Manual browser click-through is still recommended on the user's local machine.

## Runtime-Equivalent Validation

Validation used a local parsed document JSON and restored it after the test.

Checked flow:

1. Read current kind through `GET /api/documents/[id]/kind`.
2. Save override through `PUT /api/documents/[id]/kind`.
3. Confirm persisted `documentKindOverride.kind = "interview"`.
4. Confirm `documentKindOverride.source = "user"`.
5. Confirm `getEffectiveDocumentKind(document).source = "user"`.
6. Confirm JSON export includes:
   - automatic `documentKind`
   - `documentKindOverride`
   - `effectiveDocumentKind`
7. Confirm Markdown export uses effective kind.
8. Reset through `DELETE /api/documents/[id]/kind`.
9. Confirm effective source returns to `auto`.
10. Restore the local sample document JSON to its original content.

Result:

```json
{
  "putOk": true,
  "persistedOverrideKind": "interview",
  "persistedOverrideSource": "user",
  "effectiveKind": "interview",
  "effectiveSource": "user",
  "jsonHasAuto": true,
  "jsonOverrideKind": "interview",
  "jsonEffectiveSource": "user",
  "markdownHasEffectiveKind": true,
  "deleteOk": true,
  "resetSource": "auto"
}
```

## UI Cases To Manually Click

When running locally:

1. Open a real document workspace.
2. Confirm the topbar shows effective kind and source.
3. Click `修改类型`.
4. Confirm the dropdown contains:
   - 论文
   - 采访
   - 企业报告
   - 小说
   - 说明书
   - 书籍章节
   - 普通文章
   - 未知
5. Set kind to `interview`.
6. Enter reason: `人工确认这是采访稿`.
7. Save.
8. Confirm the topbar shows `用户设置`.
9. Refresh the page and confirm persistence.
10. Open Overview and confirm effective kind, source, confidence, reasons, and auto kind.
11. Reset to automatic detection.
12. Confirm the topbar and Overview return to auto / fallback.

## Prompt Path

Analysis and chat prompt builders use `getEffectiveDocumentKind`.

If a user override sets kind to `fiction`, the prompt uses the fiction hint even when automatic detection was `article`.

This phase did not call a real LLM.

## Export Validation

Runtime-equivalent validation confirmed:

- Markdown uses effective kind.
- JSON includes automatic kind, override, and effective kind.
- PPTX uses effective kind metadata through the shared exporter.
- ZIP remains compatible because it reuses the safe exporters.

Exports still avoid full document text, API keys, prompts, raw model output, and local settings.

## Current Limits

- Full browser click-through still needs user-machine validation.
- No override history.
- No bulk kind editing.
- Demo documents do not save overrides.
