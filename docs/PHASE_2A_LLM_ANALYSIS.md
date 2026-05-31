# Phase 2A LLM Analysis

Phase 2A adds a basic OpenAI-compatible analysis flow for parsed local PDF documents.

## Configuration

Create `.env.local`:

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_BASE_URL` can point to any OpenAI-compatible Chat Completions endpoint. If omitted, DocuMuse uses `https://api.openai.com/v1`. If `OPENAI_MODEL` is omitted, DocuMuse uses `gpt-4o-mini`.

Phase 2A.1 also supports configuring these values from the API Settings dialog. UI-saved local settings live in `data/settings/llm-config.json` and take priority over `.env.local`.

Phase 2A.2 adds MiniMax Token Plan as an OpenAI-compatible provider using `https://api.minimaxi.com/v1`.

## API Routes

- `POST /api/llm/test`
  - Tests the server-side model connection.
  - Returns JSON only.
  - Does not expose the API key.

- `POST /api/documents/[id]/analyze`
  - Reads the local parsed document JSON.
  - Sends the document text to an OpenAI-compatible Chat Completions API.
  - Saves structured analysis back to `data/documents/{id}.json`.

## Current Scope

- Generates summary, key points, keywords, section analysis, Chinese translation / rewrite, PPT outline, podcast script, and image prompts.
- Only analyzes the first part of long documents, currently capped around 16,000 characters.
- Uses server-side environment variables only.
- Supports local UI-saved server settings without exposing the full API key to the browser.

## Limitations

- No RAG.
- No vector database.
- No long-document chunked full-summary pipeline.
- No real document chat yet.
- No real PPT, audio, or image generation.
