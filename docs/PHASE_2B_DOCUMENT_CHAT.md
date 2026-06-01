# Phase 2B Document Chat

This phase turns the workspace chat panel into a real local document Q&A flow.

## Scope

The current implementation is intentionally lightweight:

- No vector database.
- No embeddings.
- No complex RAG pipeline.
- No database or multi-user account system.
- No media generation or PPT file export.

The flow is:

```text
User question
→ paragraph search over current document text
→ top relevant chunks
→ OpenAI-compatible LLM answer
→ source citations
→ saved chat history in document JSON
```

## Lightweight Retrieval

`src/lib/documentSearch.ts` builds searchable chunks from extracted document text.

The search strategy:

- Split text by paragraphs.
- Group content into roughly 800-1500 character chunks.
- Tokenize the question with simple English and Chinese matching.
- Score chunks by keyword overlap.
- Return the top 3-5 chunks.
- If no chunk matches, fall back to the beginning of the document.

This is not semantic retrieval. It is a transparent baseline that works without embeddings or extra infrastructure.

## Chat Prompt

`src/lib/chatPrompts.ts` builds a grounded prompt with:

- Document title.
- User question.
- Relevant excerpts only.
- Instructions to answer in Chinese.
- Instructions to avoid facts outside the excerpts.
- A fallback phrase: `文档中未明确说明。`

## API

```text
POST /api/documents/{id}/chat
```

Request:

```json
{
  "question": "这篇文章讲了什么？"
}
```

Response:

```json
{
  "ok": true,
  "answer": "回答内容",
  "sources": [
    {
      "sourceHint": "第 2 段",
      "quote": "相关片段简短摘录",
      "startChar": 1200,
      "endChar": 1800
    }
  ]
}
```

```text
GET /api/documents/{id}/chat
```

Returns saved chat messages from the local document JSON.

## Saved Chat History

Each parsed document can store:

```ts
chatMessages?: Array<{
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: Array<{
    sourceHint: string;
    quote: string;
    startChar: number;
    endChar: number;
  }>;
}>;
```

Only short source quotes are saved. Full prompts, full context, full model raw output, and API Keys are not saved.

## UI

The right-side chat panel:

- Keeps mock behavior for `/documents/demo`.
- Uses the real chat API for uploaded documents.
- Shows user messages immediately.
- Shows an assistant loading state.
- Displays source citations below assistant replies.
- Saves and reloads chat history.

## Current Limits

- Retrieval is keyword-based, not semantic.
- There is no source-click navigation to the original text yet.
- Long answers are not streamed.
- No background job or WebSocket is used.
- Future phases can upgrade retrieval to embeddings and a vector database.
