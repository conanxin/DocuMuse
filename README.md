# DocuMuse

DocuMuse is an open-source AI document reading workspace. It turns local PDF files into an interactive workspace for reading, analysis, translation-style rewriting, chunked summaries, creative outputs, and grounded document Q&A.

The current version is a local-first Next.js demo. It does not use a database, authentication, cloud storage, embeddings, or a vector database.

## Current Features

- Local PDF upload and text extraction.
- Structured PDF parsing for selectable-text PDFs: pages, paragraphs, sections, parse diagnostics, and paragraph-level source anchors.
- Heuristic document outline extraction for common Chinese / English headings, with sidebar navigation and original-text heading highlights.
- Outline runtime validation fixture for merged-heading PDFs, including inline heading detection inside large extracted paragraphs.
- Outline regression validation for Chinese / English near-real paper and report fixtures via `npm run test:outline`.
- Real-PDF outline spot checks for existing local uploads, with reduced numbered-heading false positives from footnotes, repeated headers, timestamps, and unit strings.
- Editable local outline layer: hide false positives, rename headings, adjust level/type, add missed headings from original paragraphs, and reset to automatic outline.
- Editable outline runtime validation for API behavior, effective-outline search/chunk/export paths, and all-hidden custom outlines.
- Editable outline UX improvements: move headings up/down, choose manual-heading insert position, warn about unsaved edits, show edit summaries, and surface outline quality warnings.
- Editable outline runtime-equivalent validation for UX downstream paths when browser automation is unavailable.
- Editable outline browser validation has passed locally, including rename, hide, level/type edits, ordering, reset, manual headings, and export compatibility.
- Heuristic document kind detection for new uploads and older-document fallback: paper, interview, business report, fiction, manual, book chapter, article, or unknown.
- Document kind badges, confidence, and detection reasons in the workspace overview.
- Analysis and chat prompts can receive lightweight document-kind hints without calling an extra model.
- Document kind regression now includes confusing mixed-style fixtures and a safe local real-sample review script.
- Enhanced PDF parse diagnostics: quality score, quality label, page-level text density, repeated header/footer candidates, reference/footnote hints, and language guess.
- Paragraph quality tagging for repeated headers/footers, page numbers, very short low-value text, likely footnotes, and likely references.
- Best-effort PDF text-layer coordinate extraction and paragraph-to-page-region mapping for future source positioning.
- Coordinate-aware source cards and original-text paragraph details with copyable page-region location metadata.
- Experimental single-page PDF preview with best-effort bounding-box overlay for coordinate-aware sources, scale-aware coordinate mapping, diagnostics, and basic zoom controls.
- Local PDF coordinate regression fixtures and `npm run test:pdf-coordinates` for text item / paragraph position / bounding box checks.
- Local document library from `data/documents/`.
- Reopen and delete parsed local documents.
- Workspace upload entry for adding a new document without returning home.
- API settings UI for local server-side LLM config.
- OpenAI-compatible Chat Completions support.
- MiniMax Token Plan provider support through `https://api.minimaxi.com/v1`.
- Quick analysis for fast front-of-document preview.
- Full chunked analysis with map-reduce style chunk summaries and global synthesis.
- Full chunked analysis can prefer detected outline boundaries before falling back to paragraph chunks.
- LLM JSON parsing hardening with `<think>` cleanup, code block extraction, brace extraction, and one JSON repair pass.
- Analysis progress visualization and local status metadata.
- Lightweight document chat using paragraph keyword retrieval plus LLM answers.
- Source citations with paragraph anchor navigation in the original text view.
- Source citations can include outline title metadata when available.
- Chat history clearing and Markdown export.
- Workspace export for Markdown reports, structured JSON, and Q&A records.
- Modernized PPTX export generated from existing document analysis, with Chinese report titles and cleaner card-based layouts.
- PPTX export has passed local WPS / PowerPoint visual validation and is usable as a basic deliverable deck.
- PPTX export options for theme color, cover style, and selected sections.
- PPTX export options have passed route-level validation and user-completed WPS / PowerPoint visual validation.
- Export presets for study notes, presentation packs, research digests, podcast preparation, and full archives.
- Export presets can be downloaded as server-generated ZIP packages.
- Original text reading now prefers structured paragraphs and shows page / paragraph / section metadata.
- Structured PDF parsing has passed API-level runtime validation for selectable-text PDF upload, structured JSON persistence, export compatibility, old-document fallback, and upload error paths.
- Parse diagnostics are shown in the original text reader and safely included in JSON export metadata.
- Document chat retrieval and full-analysis chunking now deweight or skip obvious low-value paragraphs while preserving the original text.
- JSON export can include safe coordinate diagnostics and paragraph position summaries without exporting full PDF text items.
- JSON and Markdown exports can include safe outline structure and outline diagnostics without exporting full original text.
- Markdown and JSON exports use the effective outline when a custom outline is saved.
- Markdown, JSON, and PPTX exports include safe document-kind metadata without exporting prompts, raw model output, API keys, or full original text.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Demo workspace:

```text
http://localhost:3000/documents/demo
```

Production build:

```bash
npm run build
```

PDF coordinate regression check:

```bash
npm run test:pdf-coordinates
```

Outline extraction regression check:

```bash
npm run test:outline
```

Document kind regression check:

```bash
npm run test:document-kind
```

Local parsed-document kind review:

```bash
npm run test:document-kind-real
```

Regenerate small coordinate fixtures:

```bash
npm run generate:pdf-coordinate-fixtures
```

## API Key Setup

You can configure LLM access in either of two ways.

### Option 1: `.env.local`

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_BASE_URL` can point to any OpenAI-compatible Chat Completions endpoint.

### Option 2: API Settings UI

Open DocuMuse, click `API Settings` / `API 设置`, and save:

- Provider
- API Key
- Base URL
- Model
- Temperature

UI-saved config is stored locally on the server at:

```text
data/settings/llm-config.json
```

This file is ignored by git. The frontend only receives a masked key.

## MiniMax Token Plan

Choose `MiniMax Token Plan` in API Settings.

Recommended settings:

```text
Base URL: https://api.minimaxi.com/v1
Model: MiniMax-M2.7
Temperature: 1.0
```

MiniMax Token Plan Key is not interchangeable with MiniMax pay-as-you-go API Key. Get it from MiniMax subscription management / Token Plan.

## Real Model Validation

MiniMax Token Plan with `MiniMax-M2.7` has been validated locally with a real PDF.

Validated paths:

- LLM connection test.
- Quick analysis.
- Full chunked analysis.
- Document chat with source citations.

This validation does not expose or document the real API Key, and it does not imply that every OpenAI-compatible provider has been fully verified.

## Local Data

```text
data/uploads/     Original uploaded PDFs
data/documents/   Parsed document JSON files
data/settings/    Local LLM settings
```

## Not Supported Yet

- OCR for scanned PDFs.
- Full production PDF reader with continuous scroll, thumbnails, search, and guaranteed coordinate overlay precision.
- EPUB and Word parsing.
- Vector RAG.
- Embeddings.
- Streaming responses.
- Generated images inside PPTX.
- Inserted images in PPTX.
- PPTX animations.
- Speaker notes.
- Complex PPTX template editor.
- Real image generation.
- Audio generation.
- Multi-user auth.
- Cloud sync or storage.
- Saved custom export presets.
- Drag-and-drop outline tree editing, nested outline reparenting, outline version history, collaborative outline editing, and cloud-synced outline edits.
- User-editable document kind override UI. Current document kind detection is heuristic and automatic.

## Security Notes

DocuMuse is currently a local single-user tool.

- API Keys are stored in a local server-side settings file or `.env.local`.
- API Keys are not returned in full to the frontend.
- Document JSON does not store API Keys.
- Chat Markdown export does not include full document text, prompts, or API Keys.
- Workspace Markdown and JSON exports do not include full document text, prompts, raw model output, or API Keys.
- PPTX exports do not include full document text, prompts, raw model output, or API Keys.
- Do not deploy this implementation as a public multi-user service without adding user accounts, encrypted secret storage, access control, and stronger isolation.

## Roadmap

- Phase 3A: export system for full analysis reports, workspace content, and chat records. Basic Markdown / JSON export is implemented.
- Phase 3B: PPTX export from existing analysis is implemented.
- Phase 3B.1: PPTX template and layout optimization is implemented.
- Phase 3B.1.1: PPTX visual feedback fixes are implemented.
- Phase 3B.1.2: PPTX visual validation has been recorded.
- Phase 3B.2: PPTX theme, cover style, and section export options are implemented.
- Phase 3B.3: PPTX option route-level and WPS / PowerPoint visual validation are recorded.
- Phase 3C: export presets and local multi-file downloads are implemented.
- Phase 3C.1: export presets as ZIP packages is implemented.
- Phase 4A: structured selectable-text PDF parsing is implemented.
- Phase 4A.1: structured PDF parsing runtime validation is recorded.
- Phase 4B: PDF parse diagnostics quality scoring is implemented.
- Phase 4C: header/footer cleanup and source quality improvements are implemented.
- Phase 4D.0: PDF text-layer coordinate extraction and paragraph mapping is implemented.
- Phase 4D.1: coordinate-aware source positioning UI is implemented.
- Phase 4D.2: PDF viewer feasibility spike is implemented.
- Phase 4D.3: PDF preview coordinate calibration, diagnostics, and zoom controls are implemented.
- Phase 4D.4: PDF coordinate regression fixture baseline and validation script are implemented.
- Phase 4D.5: expanded PDF coordinate fixtures for multi-page, dense paragraph, and lightweight two-column cases are implemented.
- Phase 4E: heuristic outline extraction and runtime validation is implemented.
- Phase 4E.1: outline runtime upload validation is recorded.
- Phase 4E.2: Chinese / English near-real outline fixtures and regression script are implemented.
- Phase 4E.3: existing local real-PDF outline spot checks and small rule tuning are recorded.
- Phase 4E.4: editable local outline corrections are implemented.
- Phase 4E.5: editable outline runtime-equivalent validation and small reliability fixes are recorded.
- Phase 4E.6: editable outline UX improvements are implemented and documented.
- Phase 4E.7: editable outline browser-validation checklist and runtime-equivalent downstream validation are recorded.
- Phase 4E.7.1: user-completed browser validation for editable outline UX is recorded as passed.
- Phase 4F: heuristic document kind detection, typed UI hints, prompt hints, safe export metadata, and regression tests are implemented.
- Phase 4F.1: real/local document-kind sample review, confusion-case regression, and small rule tuning are implemented.
- Phase 5: audio generation.
- Phase 6: image prompt to image generation.
- Phase 7: EPUB / Word support.
- Phase 8: desktop app with Tauri or Electron.

## License

MIT License.
