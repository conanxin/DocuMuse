# Current Project Status

## Status

MVP Alpha / real model validated / export baseline / structured PDF parsing

Real MiniMax Token Plan validation: passed.

PPTX WPS / PowerPoint visual validation: passed.

Structured PDF runtime validation: API-level upload, structured JSON, export compatibility, old-document fallback, and upload error paths passed.

PDF parse diagnostics: quality scoring, language guess, page-level diagnostics, repeated header/footer candidates, reference hints, and footnote hints are implemented.

Header/footer cleanup and source quality: paragraph quality tagging, low-value paragraph deweighting, and chunking skips are implemented.

PDF text-layer coordinates: best-effort text item extraction, paragraph-to-page-region mapping, coordinate-aware source UI, and an experimental single-page PDF preview spike are implemented for new uploads.

## Current Version Capabilities

DocuMuse currently supports a local PDF reading workflow:

- Upload local PDFs.
- Extract selectable PDF text.
- Store structured parse data for new PDFs: pages, paragraphs, sections, and parse diagnostics.
- Runtime-generate structure for older plain-text document JSON files.
- Score PDF text-layer parse quality and show diagnostics in the original text reader.
- Mark low-value paragraphs and reduce their impact on chat retrieval and full-analysis chunking.
- Store best-effort PDF text item coordinates and paragraph position mappings for future coordinate-aware source positioning.
- Show coordinate-aware source status, copyable location data, and paragraph bounding-box details when available.
- Preview the uploaded PDF in an experimental single-page canvas tab and draw best-effort source bounding-box overlays.
- Save original PDFs and parsed document JSON locally.
- List, reopen, and delete local documents.
- Configure OpenAI-compatible or MiniMax Token Plan LLM settings.
- Run quick analysis or full chunked analysis.
- Repair malformed JSON analysis responses once.
- Track analysis status and diagnostics.
- Ask grounded questions against document text.
- Show source citations and jump to paragraph anchors in the original text.
- Show page, paragraph, section, and parser diagnostics in the original text reader.
- Render assistant answers as safe Markdown with copy and expanded reading actions.
- Clear and export chat history as Markdown.
- Use `/settings/validation` for local real-model validation.
- MiniMax Token Plan with `MiniMax-M2.7` has passed real local validation for connection test, quick analysis, full analysis, and document chat.
- Export Markdown reports, structured JSON, and Q&A records from the workspace.
- Export modernized PPTX decks from existing document analysis, with Chinese slide titles, cleaner metadata, shorter excerpts, and card-based report pages.
- Current PPTX export status: basic deliverable usable.
- Configure PPTX export theme color, cover style, and included content sections before download.
- PPTX theme, cover, and section options have passed route-level validation and user-completed WPS / PowerPoint visual validation for the six requested Phase 3B.3 combinations.
- Export preset packs for study notes, presentations, research digests, podcast preparation, and full archives.
- Download export presets as single server-generated ZIP packages.
- Phase 4A.1 runtime validation confirmed structured PDF upload and export compatibility at API level.

## Current Architecture

- Framework: Next.js App Router.
- Language: TypeScript.
- UI: Tailwind CSS with custom shadcn-style components.
- Storage: local filesystem only.
- LLM: OpenAI-compatible Chat Completions via `fetch`.
- Retrieval: lightweight paragraph keyword matching with query preprocessing, scoring, fallback, and sentence-level quote extraction.
- Long document analysis: local text chunking plus map-reduce style LLM calls.
- Structure: heuristic page / paragraph / section generation with backward-compatible runtime fallback.
- Diagnostics: heuristic parse quality scoring, language guess, page-level text density, repeated header/footer candidates, reference section hints, and footnote hints.
- Source quality: paragraph-level quality flags for repeated headers/footers, page numbers, very short text, footnote candidates, and reference candidates.
- Coordinates: `pdfjs-dist` text-layer coordinate extraction with safe diagnostics, approximate paragraph mapping, coordinate-aware source cards, original-text coordinate details, and an experimental canvas preview.
- Export: server-side Markdown and JSON builders with sensitive-field filtering.
- PPTX export: `pptxgenjs` generated local files with a card-based 16:9 report template, Chinese report titles, text cleanup, conservative truncation, theme colors, cover styles, and section selection.

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
- `GET /api/documents/[id]/export/presets`: list preset export plans for one document.
- `GET /api/documents/[id]/export/preset`: download one preset as a ZIP package.
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
- No full production PDF viewer; the current PDF preview is an experimental single-page spike.
- No EPUB or Word parsing.
- No database.
- No login or multi-user permissions.
- No cloud sync.
- No embeddings or vector database.
- No streaming responses.
- No generated images, audio generation, animations, or external PPTX template files.
- No inserted images, speaker notes, brand-kit editor, animations, or complex PPTX template editor.
- No saved custom preset editor yet.
- PDF source navigation still defaults to extracted-text paragraph anchors; coordinate sources can also be opened in the experimental PDF preview.
- Page boundaries may be approximate when per-page text is unavailable from the parser.
- Parse diagnostics are heuristic and do not guarantee perfect PDF quality classification.
- Low-value paragraph labels are heuristic and do not modify the original extracted text.
- Export does not include full original text by default.

## Recommended Next Steps

1. Phase 4D.3 improve PDF preview reliability with measured coordinate calibration and optional zoom.
2. Phase 3C.2 saved custom export presets.
3. Phase 3B.4 optional speaker notes and richer report outline controls.
4. Add source history and original-text search.
5. Add optional streaming responses.
6. Consider embeddings and vector storage only after the local baseline and export workflow are stable.
