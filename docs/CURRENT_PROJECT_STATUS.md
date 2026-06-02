# Current Project Status

## Status

MVP Alpha / real model validated / export baseline

Real MiniMax Token Plan validation: passed.

## Current Version Capabilities

DocuMuse currently supports a local PDF reading workflow:

- Upload local PDFs.
- Extract selectable PDF text.
- Save original PDFs and parsed document JSON locally.
- List, reopen, and delete local documents.
- Configure OpenAI-compatible or MiniMax Token Plan LLM settings.
- Run quick analysis or full chunked analysis.
- Repair malformed JSON analysis responses once.
- Track analysis status and diagnostics.
- Ask grounded questions against document text.
- Show source citations and jump to paragraph anchors in the original text.
- Render assistant answers as safe Markdown with copy and expanded reading actions.
- Clear and export chat history as Markdown.
- Use `/settings/validation` for local real-model validation.
- MiniMax Token Plan with `MiniMax-M2.7` has passed real local validation for connection test, quick analysis, full analysis, and document chat.
- Export Markdown reports, structured JSON, and Q&A records from the workspace.
- Export modernized PPTX decks from existing document analysis.

## Current Architecture

- Framework: Next.js App Router.
- Language: TypeScript.
- UI: Tailwind CSS with custom shadcn-style components.
- Storage: local filesystem only.
- LLM: OpenAI-compatible Chat Completions via `fetch`.
- Retrieval: lightweight paragraph keyword matching with query preprocessing, scoring, fallback, and sentence-level quote extraction.
- Long document analysis: local text chunking plus map-reduce style LLM calls.
- Export: server-side Markdown and JSON builders with sensitive-field filtering.
- PPTX export: `pptxgenjs` generated local files with a card-based 16:9 report template.

## Main Data Directories

```text
data/uploads/     Uploaded PDF files
data/documents/   Parsed document JSON files
data/settings/    Local LLM settings
```

`data/settings/llm-config.json` is ignored by git.

## Main API Routes

- `POST /api/documents/upload`: upload and parse a PDF.
- `GET /api/documents`: list local parsed documents.
- `GET /api/documents/[id]`: read one parsed document.
- `DELETE /api/documents/[id]`: delete one parsed document and its local upload.
- `POST /api/documents/[id]/analyze`: run quick or full LLM analysis.
- `GET /api/documents/[id]/analysis-status`: read analysis progress and diagnostics.
- `GET /api/documents/[id]/chat`: read saved chat history.
- `POST /api/documents/[id]/chat`: ask a grounded document question.
- `DELETE /api/documents/[id]/chat`: clear saved chat history.
- `GET /api/documents/[id]/export`: export Markdown reports, JSON, or chat-only Markdown.
- `GET /api/documents/[id]/export?format=pptx`: export a basic PPTX deck.
- `GET /api/settings/llm`: read masked LLM settings.
- `POST /api/settings/llm`: save local LLM settings.
- `DELETE /api/settings/llm/key`: clear local API Key.
- `POST /api/llm/test`: test the configured LLM with a plain text completion.
- `GET /settings/validation`: local validation UI for connection, analysis, and document chat checks.

## Main Components

- `AppHeader`
- `RecentDocuments`
- `DocumentUploadPanel`
- `UploadDropzone`
- `ApiSettingsDialog`
- `DocumentWorkspace`
- `WorkspaceTopbar`
- `WorkspaceSidebar`
- `OverviewPanel`
- `OriginalTextPanel`
- `SectionAnalysisPanel`
- `CreativeOutputsPanel`
- `ChatPanel`
- `ChatAnswerRenderer`

## Current Limits

- No OCR.
- No EPUB or Word parsing.
- No database.
- No login or multi-user permissions.
- No cloud sync.
- No embeddings or vector database.
- No streaming responses.
- No generated images, audio generation, animations, or external PPTX template files.
- PDF source navigation is based on extracted text, not PDF coordinates.
- Export does not include full original text by default.

## Recommended Next Steps

1. Phase 3B.2 brand themes and user-selected PPTX export sections.
2. Add source history and original-text search.
3. Add optional streaming responses.
4. Consider embeddings and vector storage only after the local baseline and export workflow are stable.
