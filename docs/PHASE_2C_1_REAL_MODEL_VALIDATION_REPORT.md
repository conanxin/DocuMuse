# Phase 2C.1 Real Model Validation Report

## Validation Background

Phase 2C added a local validation page, improved lightweight retrieval, better quote extraction, and a clearer document chat prompt. This report records the first successful real-model end-to-end validation for DocuMuse.

The validation focused on confirming that the current local-first workflow can use a real MiniMax Token Plan key for connection testing, quick analysis, full chunked analysis, and grounded document chat.

No API Key, full document text, full prompt, or full model raw output is recorded in this report.

## Test Environment

- App: DocuMuse local Next.js app
- Provider: `minimax-token-plan`
- Model: `MiniMax-M2.7`
- Base URL: `https://api.minimaxi.com/v1`
- Storage: local filesystem
- Validation entry: `/settings/validation`

## Test Document

- Filename: `0010900228329939.pdf`
- Extracted text length: 26,423 characters
- Document id: `doc_54eaa96b-6e7e-4c8d-a511-7eeba61d56f1`

The document body is intentionally not included here.

## Test Results

| Test Item | Status | Result | Duration | Provider | Model | Notes |
| --- | --- | --- | ---: | --- | --- | --- |
| Connection test | success | Connection completed | 3,522 ms | minimax-token-plan | MiniMax-M2.7 | Plain text completion succeeded. |
| Quick analysis | success | Quick analysis completed | 55,967 ms | minimax-token-plan | MiniMax-M2.7 | `analysisStatus: completed`, parser strategy `direct`. |
| Full analysis | success | Full analysis completed | 35,106 ms | minimax-token-plan | MiniMax-M2.7 | `analysisStatus: completed`, parser strategy `direct`. |
| Document chat | success | Document chat completed | 3,604 ms | minimax-token-plan | MiniMax-M2.7 | Answer returned with 5 sources. |

## Conclusions

### Connection Test

The MiniMax Token Plan configuration successfully called the OpenAI-compatible chat completions endpoint. This confirms that the saved local UI configuration can be resolved by the server-side LLM client without exposing the key to the frontend.

### Quick Analysis

Quick analysis completed successfully against the real PDF. The model returned parseable JSON directly, so the repair path was not needed in this run.

### Full Analysis

Full chunked analysis completed successfully. The run confirms that the current map-reduce style analysis path can complete against a medium-length local PDF.

### Document Chat

Document chat completed successfully with 5 cited sources. This validates the lightweight paragraph retrieval, quote extraction, prompt construction, LLM answer generation, saved chat history path, and source citation shape.

## Verified Capabilities

- MiniMax Token Plan provider configuration.
- MiniMax OpenAI-compatible endpoint call.
- Real connection test through `/api/llm/test`.
- Quick document analysis.
- Full chunked document analysis.
- Structured JSON analysis persistence.
- Lightweight document chat.
- Source citation generation.
- Real-model validation UI workflow.

## Not Yet Verified

- Other OpenAI-compatible providers.
- Much longer documents.
- Scanned PDFs that require OCR.
- Concurrent analysis runs.
- Network interruption and recovery behavior.
- Provider rate-limit edge cases.
- Multi-document batch validation.

## Performance Observations

- Quick analysis took about 56 seconds.
- Full analysis took about 35 seconds.
- Document chat took about 3.6 seconds.

These timings are a single local validation snapshot and should not be treated as benchmarks. Token use, network conditions, document content, model routing, and provider load can all change results.

## Risks And Notes

- Full analysis can consume significantly more tokens than quick analysis.
- MiniMax and other OpenAI-compatible models may still occasionally return malformed JSON, so the JSON extraction and repair fallback remains necessary.
- Long documents still need more observation before raising size limits.
- Current retrieval is keyword and paragraph based, not embeddings or vector RAG.
- The current API Key storage model is suitable for local single-user use only.

## Next Phase Recommendation

Recommended next phase:

```text
Phase 3A: Export System
```

Suggested scope:

- Export a complete analysis report as Markdown.
- Export the current document workspace content.
- Keep exporting question-answer records.
- Prepare the structure for later PPT file generation.

Rationale: analysis and document chat are now validated against a real model, so the most useful next step is turning generated results into reusable, shareable artifacts before adding heavier retrieval infrastructure.
