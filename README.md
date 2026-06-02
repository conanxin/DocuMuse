# DocuMuse

DocuMuse is an open-source AI document reading workspace. It turns local PDF files into an interactive workspace for reading, analysis, translation-style rewriting, chunked summaries, creative outputs, and grounded document Q&A.

The current version is a local-first Next.js demo. It does not use a database, authentication, cloud storage, embeddings, or a vector database.

## Current Features

- Local PDF upload and text extraction.
- Local document library from `data/documents/`.
- Reopen and delete parsed local documents.
- Workspace upload entry for adding a new document without returning home.
- API settings UI for local server-side LLM config.
- OpenAI-compatible Chat Completions support.
- MiniMax Token Plan provider support through `https://api.minimaxi.com/v1`.
- Quick analysis for fast front-of-document preview.
- Full chunked analysis with map-reduce style chunk summaries and global synthesis.
- LLM JSON parsing hardening with `<think>` cleanup, code block extraction, brace extraction, and one JSON repair pass.
- Analysis progress visualization and local status metadata.
- Lightweight document chat using paragraph keyword retrieval plus LLM answers.
- Source citations with paragraph anchor navigation in the original text view.
- Chat history clearing and Markdown export.
- Workspace export for Markdown reports, structured JSON, and Q&A records.

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
- EPUB and Word parsing.
- Vector RAG.
- Embeddings.
- Streaming responses.
- Real PPT file generation.
- Real image generation.
- Audio generation.
- Multi-user auth.
- Cloud sync or storage.

## Security Notes

DocuMuse is currently a local single-user tool.

- API Keys are stored in a local server-side settings file or `.env.local`.
- API Keys are not returned in full to the frontend.
- Document JSON does not store API Keys.
- Chat Markdown export does not include full document text, prompts, or API Keys.
- Workspace Markdown and JSON exports do not include full document text, prompts, raw model output, or API Keys.
- Do not deploy this implementation as a public multi-user service without adding user accounts, encrypted secret storage, access control, and stronger isolation.

## Roadmap

- Phase 3A: export system for full analysis reports, workspace content, and chat records. Basic Markdown / JSON export is implemented.
- Phase 3B: optional PPTX file generation from exported outlines.
- Phase 4: optional embeddings and vector database RAG.
- Phase 5: audio generation.
- Phase 6: image prompt to image generation.
- Phase 7: EPUB / Word support.
- Phase 8: desktop app with Tauri or Electron.

## License

MIT License.
