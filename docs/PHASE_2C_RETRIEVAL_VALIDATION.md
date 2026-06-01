# Phase 2C Retrieval Validation

This phase improves the existing lightweight retrieval path and adds a local validation page for real-model checks.

## Why No Vector Database Yet

DocuMuse is still validating the local-first product loop. The current goal is to improve retrieval quality without adding infrastructure:

- No embeddings.
- No vector database.
- No complex RAG pipeline.
- No background task system.

This keeps setup simple and makes failures easier to inspect.

## Validation Page

Local validation page:

```text
/settings/validation
```

It shows:

- Provider
- Model
- Base URL
- Whether an API Key exists
- Masked key
- Config source: `ui`, `env`, or `default`

It can run:

- Test connection
- Test quick analysis
- Test full analysis
- Test document chat

The page uses existing API routes and does not save results to external services. It does not display full API Keys, full document text, or prompts.

## Query Preprocessing

`src/lib/documentSearch.ts` now extracts:

- English lowercase tokens.
- Chinese phrases.
- Chinese bigrams.
- Chinese characters as fallback.
- Numbers and acronyms.

Common stop words are removed.

## Scoring Rules

Chunks are scored with:

- Full question phrase match bonus.
- Token match frequency.
- Term coverage bonus.
- Source hint match bonus.
- Keyword proximity bonus.
- Hit density bonus.
- Slight penalty for very long chunks.
- Duplicate prefix removal.

## Top K Strategy

The search returns up to five chunks. It tries to return at least three sources. If all scores are weak, it mixes the best matches with the beginning of the document as a transparent fallback.

## Quote Extraction

Source quotes are now selected from the most relevant sentence in a chunk rather than always taking the beginning of the chunk.

Sentence splitting supports Chinese and English punctuation. Quotes are kept short, usually 80-180 characters.

## Current Limits

- Retrieval is still lexical, not semantic.
- Synonyms and paraphrases may be missed.
- Source ranking depends on extracted text quality.
- No PDF coordinate-level citations.

## Future Upgrade Path

- Add optional embeddings.
- Add vector database storage.
- Add hybrid lexical + semantic retrieval.
- Add PDF page coordinate mapping for precise citation jumps.
