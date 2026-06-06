# Phase 4E.3: Real PDF Outline Validation

Phase 4E.3 validates the heuristic outline extractor against existing local uploaded PDFs and tightens a small set of noisy numbered-heading rules.

This phase does not call LLMs, does not perform OCR, does not add machine-learning heading detection, and does not copy real PDF files into the repository.

## Scope

Validated with local uploaded PDFs already present under `data/documents/` and their corresponding local upload files under `data/uploads/`.

Sample categories covered:

- English academic / technical PDF.
- Older English academic PDF.
- Form-like PDF with repeated medical/header text.
- Short report-style PDF.
- Long-form book / essay extract.

The PDF contents are not committed to git and are not reproduced in this document.

## Validation Method

The validation used runtime document structure generation without writing back to document JSON:

- `ensureDocumentStructure(document)`
- `extractDocumentOutline(...)`
- `flattenOutline(...)`
- `buildSearchChunks(...)`
- `searchRelevantChunks(...)`
- `chunkText(...)`

No LLM request was made.

## Results

| Sample | Result |
| --- | --- |
| `2604.14004v1.pdf` | Detected a usable academic outline with `Abstract`, `Introduction`, numbered sections, subsections, appendices, and references. |
| `Arrow1962.pdf` | Most repeated page/header noise was filtered; a few short all-caps section-like headings remain. |
| `0010900228329939.pdf` | Repeated medical/header strings were no longer promoted into outline nodes after tuning. |
| `35179.pdf` | Detected `References` and `Introduction`; one prior person-name false positive was removed. |
| `The Cross of Redemption Uncollected Writings.pdf` | No reliable outline detected; fallback behavior remains expected. |

## Rule Tuning

Small rule changes were made in `src/lib/outlineExtractor.ts`:

- Inline numbered headings now reuse the same rejection logic as paragraph-level numbered headings.
- Numeric heading prefixes outside a conservative range are rejected.
- Common noise terms such as URLs, UTC timestamps, kilograms, and repeated medical labels are rejected.
- Single-word numbered headings are only accepted when they are known section-like terms, recognized keywords, or Chinese heading text.
- Arbitrary all-caps single words are no longer accepted just because they are uppercase.
- Common academic section terms such as `coding`, `transfer`, `memory`, `experimental`, and `additional` remain accepted.

## Source Metadata

Read-only validation confirmed:

- Search chunks can include `outlineNodeId`, `outlineTitle`, and `outlineType`.
- Source hints can include page number, outline title, and paragraph number.
- Existing paragraph/source fallback remains available when no outline exists.

## Full Analysis Chunking

Read-only validation confirmed:

- `chunkText(document)` prefers outline boundaries when available.
- Chunk metadata can include `outlineNodeId`, `outlineTitle`, `paragraphIds`, `startPage`, and `endPage`.
- Long sections still split by paragraph size limits.
- Documents without outline continue to fall back to paragraph chunking.

## Sidebar And Original Text UI

The code path is unchanged from Phase 4E.1:

- Workspace sidebar prefers detected outline nodes.
- Clicking an outline node switches to original text and highlights the target paragraph.
- Original text heading paragraphs can show outline level and type labels.

This phase did not complete an automated browser click-through for every local real PDF; manual UI spot checks should still be repeated with user-selected confidential documents.

## Export Compatibility

The export logic remains safe:

- Markdown can include a detected document outline.
- JSON can include safe `outline` and `outlineDiagnostics`.
- PPTX and ZIP exports continue to use existing sanitized exporters.

Exports must not include API keys, prompts, raw model output, full original text, `data/settings`, or absolute upload paths.

## Regression Results

```text
npm run test:outline
Summary: 4 passed, 0 failed.

npm run test:pdf-coordinates
Summary: 4 passed, 3 pending, 0 failed.
```

## Known Limits

- The extractor is still heuristic.
- Old publications with sparse or unusual typography may produce only partial outlines.
- Some legitimate all-caps one-word headings may be missed unless they match known section vocabulary.
- Multi-column academic PDFs can still merge text in ways that reduce heading precision.
- Scanned PDFs and image-only PDFs remain out of scope.

## Next Step

Phase 4E.4 should focus on an optional user-facing outline review/edit layer, so users can hide false positives, rename headings, or pin missing headings without introducing LLM or OCR dependencies.

Phase 4E.4 follow-up has been implemented as a local editable outline layer with hide, rename, level/type changes, paragraph-to-heading insertion, reset, and effective-outline usage.
