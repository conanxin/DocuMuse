# Phase 2B.3 Chat Readability

## Goal

Phase 2B.3 improves the readability of real document chat answers. LLM answers often contain Markdown such as headings, bold text, lists, blockquotes, inline code, and mixed Chinese/English content. Rendering those answers as plain text made long replies difficult to scan.

## Markdown Rendering

DocuMuse now renders assistant answers with a lightweight safe Markdown renderer:

- Paragraphs.
- `###` and `####` headings.
- Bold text.
- Bullet and numbered lists.
- Blockquotes.
- Inline code.
- Line breaks.

The renderer does not use raw HTML and does not inject HTML into the DOM.

## ChatPanel Layout

ChatPanel now separates:

- Answer body.
- Answer actions.
- Source citations.

Assistant replies use more readable spacing and line height. Sources are displayed as compact cards with `sourceHint` and a short quote preview. Clicking a source still triggers original-text positioning.

## Answer Actions

Each assistant answer includes:

- Copy answer.
- Expand reading.

The expanded reading modal shows the full rendered Markdown answer and sources in a wider layout. It does not show API keys, prompts, full document text, or hidden raw model output.

## Prompt Update

The document chat prompt now asks the model to answer in a stable Markdown shape:

```markdown
### Direct Answer / 直接回答

...

### Key Evidence / 关键依据

- ...

### Quotable Sentences / 可引用句子

- ...
```

The prompt also asks the model not to paste long source excerpts into the answer body because the UI displays source cards separately.

## Security

- Raw HTML is not rendered.
- API keys are not exposed.
- Full prompts are not shown.
- Full document text is not displayed in ChatPanel.
- Source quotes remain short excerpts.

## Current Limits

- This is a lightweight renderer, not a full CommonMark implementation.
- Tables and task lists are not rendered as rich Markdown yet.
- Existing historical answers may not perfectly match the new prompt shape, but they still render safely.
