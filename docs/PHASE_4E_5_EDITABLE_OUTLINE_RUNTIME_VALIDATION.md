# Phase 4E.5: Editable Outline Runtime Validation

Phase 4E.5 validates the editable outline foundation from Phase 4E.4 and applies small reliability fixes.

This phase does not call LLMs, does not perform OCR, does not add a drag-and-drop outline editor, and does not change API key handling.

## Runtime Scope

Validated against an existing local `structured-headings.pdf` document under `data/documents/`.

The validation temporarily wrote `outlineEditState` to the local document JSON and restored the original file afterward.

## API Validation

Validated:

- `GET /api/documents/[id]/outline`
- `PUT /api/documents/[id]/outline`
- `POST /api/documents/[id]/outline/reset`

Results:

| Check | Result |
| --- | --- |
| GET existing document | 200 JSON |
| GET missing document | 404 JSON |
| PUT custom outline | 200 JSON |
| Invalid custom outline | 400 JSON |
| Hidden node removed from `effectiveOutline` | Passed |
| Manual node appears in `effectiveOutline` | Passed |
| Reset returns to automatic outline | Passed |

The API does not return full document text, API keys, prompts, or raw model output.

## Sidebar Edit UI

Implemented in Phase 4E.4:

- Enter edit mode.
- Rename heading.
- Hide / restore heading.
- Change level.
- Change type.
- Save custom outline.
- Reset to automatic outline.

Browser automation could not be completed in this environment because the local dev server process and in-app browser control were blocked by the current sandbox. The UI should still be manually verified with a running local dev server.

## Add Heading From Original Paragraph

Implemented in Phase 4E.4:

- Original text paragraphs expose `设为章节标题`.
- The form collects title, level, and type.
- Saved nodes are marked `manual` and `userEdited`.
- The original paragraph remains unchanged.

API/effective-outline validation confirmed manual nodes enter `effectiveOutline`.

## Effective Outline Validation

Validated by direct runtime-equivalent checks:

- `documentSearch` uses custom outline titles.
- Hidden custom nodes do not appear in source metadata.
- Manual nodes can appear in source metadata.
- `textChunker` uses custom outline boundaries.
- Markdown export uses the effective outline section.
- JSON export includes:
  - automatic `outline`
  - safe `outlineEditState` summary
  - safe `effectiveOutline`
- PPTX and ZIP exporters complete without crashing.

## Bug Fixes

Fixed:

- If a custom outline exists but all nodes are hidden, `getEffectiveOutline(document)` now returns an empty outline instead of falling back to the automatic outline.

This preserves the user's intent to hide all detected headings.

## Regression

Validated:

```text
npm run build
npm run test:outline
npm run test:pdf-coordinates
```

Latest results:

- Outline fixtures: 4 passed, 0 failed.
- Coordinate fixtures: 4 passed, 3 pending, 0 failed.
- Build: passed.

## Manual Browser Checklist

Run locally:

```bash
npm run dev -- -p 3031
```

Then:

1. Open a real document with outline nodes.
2. Click `编辑大纲`.
3. Rename one node.
4. Hide one node.
5. Change level and type.
6. Save.
7. Refresh the page and confirm `自定义大纲` persists.
8. Click a custom node and confirm original-text navigation.
9. Add a manual heading from an original paragraph.
10. Refresh and confirm the manual heading persists.
11. Reset to the automatic outline.

## Phase 4E.6 UX Follow-up

Phase 4E.6 adds small editing ergonomics on top of the validated API foundation:

- Move outline nodes up or down in the flat custom-outline list.
- Insert manual headings at the end or after an existing outline node.
- Warn before discarding unsaved edits.
- Show renamed / hidden / manual-node counts while editing.
- Show gentle outline quality warnings from diagnostics.

These improvements were build-validated and covered by outline / coordinate regression scripts. Full browser click-through remains a local manual validation item.

## Phase 4E.7 Validation Follow-up

Phase 4E.7 attempted browser validation, but the local dev server could not be kept reachable in the sandboxed environment. A runtime-equivalent validation temporarily wrote a custom outline to a local fixture document, verified custom order / hidden / renamed / manual nodes across source metadata, full-analysis chunking, Markdown / JSON export, PPTX export, and ZIP export, then restored the original document JSON.

## Known Limits

- No drag-and-drop tree editing.
- No nested reparenting UI.
- No outline version history.
- No collaborative editing.
- No cloud sync.
- Manual headings can be inserted at the end or after an existing node, but there is no drag-and-drop tree placement.
- Browser UI click-through still needs local manual verification.
