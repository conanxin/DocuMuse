# Phase 2B.2 Source Anchors

This phase improves source navigation in document chat by adding paragraph-level anchors to the original text reader.

## Paragraph Anchors

`src/lib/sourceAnchors.ts` builds runtime paragraph anchors from extracted document text:

```ts
{
  id: "p-1",
  index: 1,
  text: "...",
  startChar: 0,
  endChar: 860,
  sourceHint: "第 1 段"
}
```

Anchors are generated at runtime and are not added to the main document JSON structure. Long paragraphs are split into smaller anchors around 1200-1800 characters so navigation remains usable.

## Source Priority

Source navigation uses this priority:

1. `anchorId`
2. `startChar` / `endChar`
3. `quote` exact match
4. `quote` short prefix match
5. Friendly failure notice

New chat responses include `anchorId` because lightweight search now builds chunks from paragraph anchors. Older chat records without `anchorId` still work through range or quote fallback.

## Source Selection UI

The chat panel keeps the selected source highlighted in the current browser session. Clicking another source updates the selected card. Clearing the original text highlight also clears the selected source state.

## Original Text Reader

The original text view now renders paragraph cards with DOM ids like:

```text
source-p-1
source-p-2
```

Clicking a source switches to the original text tab, scrolls the matching paragraph into view, and highlights it with a yellow background and blue left border.

## Current Limits

- This is not semantic alignment.
- It does not use PDF page coordinates.
- It depends on extracted text character offsets and paragraph splitting.
- Future versions can integrate embeddings, vector retrieval, and PDF coordinate-level citations.
