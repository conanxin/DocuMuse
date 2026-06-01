# Phase 2B.1 Chat Source Navigation And Export

This phase improves the document chat experience with traceable source navigation, chat clearing, and Markdown export.

## Source Navigation

Assistant replies display source cards. Clicking a source card:

1. Switches the workspace to the original text tab.
2. Passes the source range into `OriginalTextPanel`.
3. Highlights the matching text.
4. Scrolls the highlighted range into view.

Sources use:

```ts
{
  sourceHint: string;
  quote: string;
  startChar: number;
  endChar: number;
}
```

`startChar` and `endChar` are used first. If they are missing or invalid, DocuMuse falls back to quote matching. If the quote still cannot be found, the UI shows a notice that the source could not be positioned but remains useful as a reference.

## Original Text Improvements

The original text panel now shows:

- Text length.
- Page count.
- Parsed time.
- Current highlighted source notice.
- Clear highlight action.
- Scrollable original text with a yellow highlight range.

## Clear Chat History

The chat API supports:

```text
DELETE /api/documents/{id}/chat
```

This clears only `chatMessages` in the current local document JSON. It does not delete the document, extracted text, analysis, chunks, or metadata.

The demo document clears only local UI state and does not call the API.

## Markdown Export

The chat panel can export the current visible chat history as Markdown. The export includes:

- Document title.
- Export time.
- User questions.
- Assistant answers.
- Short source quotes.

The export does not include full document text, prompts, raw model output, or API Keys.

## Current Limits

- Source navigation is based on character ranges or quote matching, not semantic alignment.
- Source cards do not yet support persistent selection styling.
- Export is generated in the browser and downloads locally.
- There is no server-side export history.
