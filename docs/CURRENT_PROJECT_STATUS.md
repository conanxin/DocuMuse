# Current Project Status

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
- Clear and export chat history as Markdown.

## Current Architecture

- Framework: Next.js App Router.
- Language: TypeScript.
- UI: Tailwind CSS with custom shadcn-style components.
- Storage: local filesystem only.
- LLM: OpenAI-compatible Chat Completions via `fetch`.
- Retrieval: lightweight paragraph keyword matching.
- Long document analysis: local text chunking plus map-reduce style LLM calls.

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
- `GET /api/settings/llm`: read masked LLM settings.
- `POST /api/settings/llm`: save local LLM settings.
- `DELETE /api/settings/llm/key`: clear local API Key.
- `POST /api/llm/test`: test the configured LLM with a plain text completion.

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

## Current Limits

- No OCR.
- No EPUB or Word parsing.
- No database.
- No login or multi-user permissions.
- No cloud sync.
- No embeddings or vector database.
- No streaming responses.
- No true PPT, image, or audio generation.
- PDF source navigation is based on extracted text, not PDF coordinates.

## Recommended Next Steps

1. Real-key validation across OpenAI-compatible and MiniMax Token Plan providers.
2. Improve paragraph search and source ranking.
3. Add source history and original-text search.
4. Add optional streaming responses.
5. Consider embeddings and vector storage only after the local baseline is stable.
