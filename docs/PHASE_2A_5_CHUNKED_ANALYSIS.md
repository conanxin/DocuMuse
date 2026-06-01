# Phase 2A.5 Chunked Analysis

This phase adds workspace upload access, visible analysis progress, and a basic long-document chunked analysis flow. It does not add RAG, document chat, vector storage, real PPT export, image generation, audio generation, login, or cloud upload.

## Workspace Upload

The document workspace now includes an `上传新文档` action in the top bar. It opens a modal that reuses the same local PDF upload flow as the home page:

1. Uploading.
2. Extracting PDF text.
3. Generating the document workspace.
4. Redirecting to `/documents/{newDocumentId}`.

PDF files remain local under `data/uploads/`, and parsed JSON remains under `data/documents/`.

## Quick vs Full Analysis

DocuMuse now supports two analysis modes:

- `quick`: analyzes the front portion of the document, preserving the earlier fast preview behavior.
- `full`: splits the whole extracted text into chunks, analyzes each chunk, then synthesizes a global result from chunk analyses.

The analyze API accepts:

```json
{
  "mode": "quick"
}
```

or:

```json
{
  "mode": "full"
}
```

The workspace currently exposes two buttons: `快速分析` and `完整分析`.

## Chunking Strategy

`src/lib/textChunker.ts` implements `chunkText(text, options)`.

The basic strategy:

- Prefer paragraph and sentence boundaries.
- Target chunk size is about 7,000 characters.
- Maximum chunk size is 9,000 characters.
- Overlap is about 400 characters.
- Store metadata only: chunk id, index, character range, and source hint.

DocuMuse does not save full chunk text into document JSON to avoid making local JSON files unnecessarily large.

## Map-Reduce Flow

Full analysis uses a basic map-reduce pipeline:

1. Chunking: split the document into `TextChunk[]`.
2. Map: call the LLM for each chunk and save a `ChunkAnalysis`.
3. Reduce: call the LLM with all chunk analyses and generate the standard document analysis schema.
4. Save: persist final analysis, chunk metadata, chunk analyses, progress, model/provider metadata, and diagnostics.

Chunk analysis output:

```ts
{
  chunkId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  quotes: string[];
  entities: string[];
  sourceHint: string;
}
```

## Progress Fields

Document JSON may include:

```ts
analysisMode: "quick" | "full";
analysisStatus: "idle" | "running" | "completed" | "failed";
analysisProgress?: {
  step: "idle" | "chunking" | "chunk_analysis" | "synthesis" | "saving" | "completed" | "failed";
  totalChunks?: number;
  completedChunks?: number;
  currentChunk?: number;
  message?: string;
};
chunks?: ChunkMetadata[];
chunkAnalyses?: ChunkAnalysis[];
```

The workspace polls:

```text
GET /api/documents/{id}/analysis-status
```

every two seconds while analysis is running. Because the current analyze route is still a synchronous request, polling may show limited intermediate updates depending on the local server runtime, but the status data is now persisted for a future background job or WebSocket implementation.

## Security And Storage

- API Keys are not stored in document JSON.
- Full raw model output is not stored.
- Full chunk text is not stored in document JSON.
- Diagnostics save only short previews.
- Uploads and parsed documents remain local.

## Current Limits

- Full analysis can take longer and consume more tokens because it calls the model once per chunk plus once for global synthesis.
- There is no background queue or WebSocket yet.
- There is no RAG or vector database.
- Document chat remains a placeholder.
- PPT, image, and audio outputs remain structured text, not generated files or media.
