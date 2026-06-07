# Phase 4E.7: Editable Outline Browser Validation

Phase 4E.7 is a browser-focused validation pass for the editable outline workflow introduced in Phase 4E.4 and improved in Phase 4E.6.

## Scope

This phase does not add new outline features. It validates and documents:

- Entering outline edit mode.
- Renaming, hiding, restoring, level changes, and type changes.
- Moving nodes up and down.
- Unsaved-change prompts.
- Reset confirmation.
- Difference summary counts.
- Adding a manual heading from an original-text paragraph.
- Downstream compatibility with source metadata, full-analysis chunking, and exports.

No LLM calls, OCR, EPUB / Word parsing, PDF viewer changes, API key changes, drag-and-drop editor, collaboration, or cloud sync were added.

## Browser Validation Status

Full browser click-through could not be completed inside the current sandboxed run because the local dev server could not be kept reachable for the in-app browser. Attempts to keep a `next dev -p 3031` process alive were blocked or terminated by the environment.

The following browser checklist remains for local manual validation:

1. Open a real document with detected outline nodes.
2. Click `编辑大纲`.
3. Rename a node.
4. Hide and restore a node.
5. Change level and type.
6. Move a node up and down.
7. Save and refresh.
8. Confirm `自定义大纲` persists.
9. Cancel with unsaved edits and confirm the warning.
10. Reset to automatic outline and confirm the custom outline is cleared.
11. Add a manual heading from the original text view.
12. Insert the manual heading after a selected outline node.
13. Click the manual node and confirm original-text navigation.
14. Confirm demo and older documents do not crash.

## Runtime-Equivalent Validation

A local fixture document was used for a non-browser equivalent validation. The script temporarily wrote a custom `outlineEditState`, validated downstream behavior, and restored the original document JSON.

Validated behavior:

- A renamed node appears in `effectiveOutline`.
- A hidden node is filtered from `effectiveOutline`.
- A manual node inserted into the custom outline appears in the saved order.
- `documentSearch` sees custom outline metadata.
- `textChunker` uses custom outline titles.
- Markdown export uses the effective outline.
- JSON export includes safe `outlineEditState` and `effectiveOutline`.
- PPTX export still returns a valid buffer.
- ZIP preset export still returns a valid buffer.

The temporary write was restored after validation.

## Regression Results

```bash
npm run build
npm run test:outline
npm run test:pdf-coordinates
```

Results:

- Build passed.
- Outline fixtures: 4 passed, 0 failed.
- PDF coordinate fixtures: 4 passed, 3 pending, 0 failed.

## Findings

No code bug was found during the runtime-equivalent validation.

The only open validation gap is true browser click-through on the user's machine.

## Security

The validation did not call LLMs and did not change API key handling. Exports were checked through safe exporters and continue to avoid:

- API keys
- prompts
- raw model output
- full original document text
- local settings paths

## Current Limits

- Browser click-through still needs local manual verification.
- No drag-and-drop outline tree editor.
- No nested reparenting UI.
- No outline version history.
- No collaboration or cloud sync.
- No browser unload guard for unsaved changes.
