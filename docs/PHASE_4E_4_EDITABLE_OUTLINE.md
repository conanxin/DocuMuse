# Phase 4E.4: Editable Outline

Phase 4E.4 adds a local editable outline layer on top of the automatically detected document outline.

This phase does not call LLMs, does not perform OCR, does not add machine-learning heading detection, and does not introduce collaboration or cloud sync.

## Goal

Users can correct heuristic outline extraction results in the workspace:

- Hide false-positive headings.
- Rename headings.
- Change heading level.
- Change heading type.
- Add a missed heading from an original-text paragraph.
- Save the edited outline locally.
- Reset back to the automatically detected outline.

## Data Model

The automatic outline is preserved:

```ts
outline?: DocumentOutlineNode[];
```

User edits are stored separately:

```ts
outlineEditState?: {
  mode: "auto" | "custom";
  customOutline?: EditableOutlineNode[];
  updatedAt?: string;
  note?: string;
};
```

`mode="auto"` uses the detected outline. `mode="custom"` uses `customOutline` after filtering hidden nodes.

## Effective Outline

`src/lib/outlineUtils.ts` provides:

- `getEffectiveOutline(document)`
- `createEditableOutlineFromAuto(outline)`
- `resetOutlineEdits(document)`

The effective outline is used by:

- Workspace sidebar navigation.
- Original text heading labels.
- Document chat source metadata.
- Full-analysis chunking.
- Markdown and JSON exports.

## API Routes

New routes:

```text
GET  /api/documents/[id]/outline
PUT  /api/documents/[id]/outline
POST /api/documents/[id]/outline/reset
```

The APIs:

- Return JSON for success and failure.
- Save only `outlineEditState`.
- Do not modify `document.text`.
- Do not expose API keys, prompts, raw model output, or full document text.

## Sidebar Editing

The workspace sidebar shows the current mode:

- `自动识别大纲`
- `自定义大纲`

Editing supports:

- Title text.
- `level`: 1 / 2 / 3.
- `type`: abstract, introduction, section, subsection, conclusion, references, appendix, unknown.
- Hidden / visible state.
- Save, cancel, and reset.

The first version uses a flat editing list and level controls instead of a drag-and-drop tree editor.

## Add Heading From Paragraph

The original-text panel can add a selected paragraph as a manual outline heading.

The manual node stores:

- `manual: true`
- `userEdited: true`
- `startParagraphId`
- `pageNumber`
- `startChar`
- `endChar`
- `originalTitle`

The original paragraph remains unchanged.

## Export Behavior

Markdown export uses the effective outline.

JSON export can include:

- Automatic `outline`.
- Safe `outlineEditState` summary.
- Safe `effectiveOutline`.

PPTX and ZIP exports continue to use existing sanitized exporters and should not include sensitive fields.

## Security

Editable outline data must not include:

- API keys.
- Prompts.
- Raw model output.
- Full original text.
- `data/settings`.
- Absolute upload paths.

## Current Limits

- No drag-and-drop tree editor.
- No collaborative editing.
- No cloud sync.
- No outline version history.
- Manual headings are appended rather than reordered visually.
- Editing is local single-user state stored in `data/documents/{id}.json`.

## Validation

Recommended checks:

```bash
npm run build
npm run test:outline
npm run test:pdf-coordinates
```

Runtime checks:

- Open a real document with an outline.
- Rename a heading and save.
- Hide a false-positive heading and save.
- Add a heading from an original-text paragraph.
- Refresh the document and confirm the custom outline persists.
- Reset to automatic outline.
- Confirm chat sources and full-analysis chunks use the effective outline.
- Confirm Markdown / JSON / PPTX / ZIP exports do not crash.

## Phase 4E.5 Runtime Follow-up

Phase 4E.5 validated the outline APIs and effective-outline behavior with a local document. It also fixed the all-hidden custom outline case: when every custom node is hidden, the effective outline stays empty instead of falling back to the automatic outline.

## Phase 4E.6 UX Follow-up

Phase 4E.6 improves the editing workflow with flat-list up/down ordering, manual-heading insert position selection, unsaved-change confirmations, edit-difference summaries, and lightweight automatic-outline quality warnings. It still does not implement drag-and-drop tree editing, nested reparenting, version history, collaboration, or cloud sync.
