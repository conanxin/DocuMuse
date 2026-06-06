# Phase 4E.6: Editable Outline UX

Phase 4E.6 improves the editable outline experience without adding a drag-and-drop tree editor or changing the outline API contract.

## Scope

This phase focuses on small, high-value interaction fixes:

- Move outline nodes up or down in the current flat outline list.
- Choose where a manual heading should be inserted when adding it from an original-text paragraph.
- Warn before discarding unsaved outline edits.
- Show a short edit-difference summary while editing.
- Surface lightweight automatic-outline quality warnings.

No LLM calls, OCR, EPUB / Word parsing, PDF viewer changes, API key changes, or cloud sync were added.

## Move Up / Down

Editable outline rows now include `上移` and `下移` controls.

The first version keeps ordering simple:

- Nodes are moved within the current flat list.
- `startParagraphId`, `startChar`, page metadata, and source anchors are preserved.
- Saving stores the reordered `customOutline` array.
- Refreshing the workspace keeps the saved custom order.

This is intentionally not a drag-and-drop tree editor.

## Insert Position

When a user clicks `设为章节标题` on an original-text paragraph, the form now includes an insert-position selector:

- Insert at the end.
- Insert after an existing outline node.

The new manual node inherits paragraph metadata such as paragraph id, page number, and character offset. It is inserted into `customOutline`, switches the document to custom-outline mode, and becomes part of the effective outline.

## Unsaved Changes

The edit mode now warns before destructive navigation inside the outline editor:

- `取消` asks whether to discard unsaved changes.
- `重置为自动识别` asks whether to clear the custom outline.

The implementation does not intercept browser tab close or page unload.

## Difference Summary

While editing, the sidebar shows a compact summary:

```text
已重命名 X 个 · 已隐藏 X 个 · 手动新增 X 个
```

After saving, the sidebar continues to show `当前使用自定义大纲` when the custom outline is active.

## Outline Quality Warnings

The sidebar can show a gentle warning when the automatic outline may be incomplete.

Warnings are based on:

- zero outline nodes
- warnings from `outlineDiagnostics`
- many low-confidence outline nodes
- very short outlines for long documents

The message is intentionally mild:

```text
自动大纲可能不完整，你可以使用编辑大纲补充或修正。
```

## Downstream Compatibility

The effective outline remains the single source used by downstream features:

- Sidebar navigation.
- Source metadata and source hints.
- Full-analysis chunk boundaries.
- Markdown export.
- JSON export.

Hidden custom nodes are filtered from the effective outline. Manual nodes participate in navigation, source metadata, chunking, and safe exports.

## Validation

Automated validation completed:

```bash
npm run build
npm run test:outline
npm run test:pdf-coordinates
```

Results:

- Build passed.
- Outline fixtures passed: 4 passed, 0 failed.
- Coordinate fixtures passed: 4 passed, 3 pending, 0 failed.

Browser click-through validation remains pending in the current sandboxed environment. The local dev-server/browser path should be manually rechecked on the user's machine.

## Current Limits

- No drag-and-drop tree editing.
- No nested reparenting UI.
- No outline version history.
- No collaboration or cloud sync.
- No browser unload guard for unsaved changes.
- Outline quality warnings are heuristic.
