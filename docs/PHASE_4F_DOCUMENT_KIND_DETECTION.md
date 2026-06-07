# Phase 4F: Document Kind Detection

Phase 4F adds heuristic document-kind detection for parsed PDF documents.

The goal is to give DocuMuse a lightweight typed-reading layer so future analysis, chat, export, and UI flows can adapt to papers, interviews, reports, fiction, manuals, book chapters, articles, or unknown documents.

## Scope

Implemented:

- `DocumentKind`
- `DocumentKindDetection`
- `documentKind?: DocumentKindDetection` on parsed documents
- `src/lib/documentKindDetector.ts`
- upload-time detection for new PDFs
- runtime fallback for older document JSON
- overview / topbar UI display
- type-aware prompt hints for analysis and chat
- safe Markdown / JSON / PPTX export compatibility
- `npm run test:document-kind`

Not implemented:

- LLM-based classification
- machine-learning classifier
- OCR
- EPUB / Word support
- user-editable document kind

## Supported Kinds

```ts
paper
interview
business-report
fiction
manual
book-chapter
article
unknown
```

## Detection Rules

The first version is heuristic and score-based.

Signals include:

- `paper`: Abstract / 摘要, Introduction / 引言, Method, Results, Conclusion, References, DOI, arXiv, citations.
- `interview`: Q/A, 问/答, Interviewer / Interviewee, speaker-colon dialogue patterns.
- `business-report`: annual report, quarterly report, ESG, revenue, risk, strategy, governance, shareholders, business segments.
- `fiction`: Chapter / 第 X 章, narrative dialogue, characters, scenes, plot signals, lack of paper-style references.
- `manual`: Step, How to, Troubleshooting, FAQ, install, configuration, parameters, commands, warnings.
- `book-chapter`: chapter structure, concept explanations, examples, summaries, exercises, but without strong paper signals.
- `article`: medium-length continuous prose without stronger structural signals.
- `unknown`: insufficient or conflicting signals.

The detector returns:

- `kind`
- `confidence`
- `reasons`
- `detectedAt`
- `signals`

When scores are close or weak, confidence is lowered instead of forcing a strong result.

## Upload Integration

New PDF uploads run `detectDocumentKind` after structured parsing and outline extraction.

The saved document JSON includes:

```ts
documentKind?: {
  kind: DocumentKind;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  detectedAt: string;
  signals?: Record<string, boolean>;
}
```

If detection fails, the document falls back to `unknown` and upload continues.

## Backward Compatibility

Older documents may not have `documentKind`.

Runtime fallback uses `ensureDocumentKind(document)` to infer a kind from existing text, paragraphs, outline, and diagnostics without forcing a write-back to the old JSON file.

## UI

The workspace now shows document-kind information in:

- Workspace topbar: compact kind / confidence badge.
- Overview panel: kind, confidence, and expandable detection reasons.

Low-confidence detection shows a gentle warning that analysis may use a general mode.

Phase 4F.2 adds a manual override dialog for real documents and shows whether the current kind comes from automatic detection, user setting, or fallback inference.

## Prompt Integration

Analysis and chat prompts receive a short optional kind hint:

- Paper: research question, method, results, conclusion, limitations.
- Interview: speakers, questions, viewpoints, memorable quotes.
- Business report: metrics, strategy, risk, segments, governance.
- Fiction: characters, scenes, plot, themes.
- Manual: procedures, warnings, configuration, troubleshooting.
- Book chapter: concepts, examples, chapter structure.
- Article / unknown: general reading analysis.

The API response structure is unchanged.

When `documentKindOverride` exists, prompt builders use the effective user-selected kind instead of the automatic kind.

## Export Compatibility

- Markdown export includes document kind and confidence in metadata.
- JSON export includes safe `documentKind`.
- PPTX cover metadata can show document kind.
- Phase 4F.2 exports use the effective kind. JSON includes safe `documentKind`, `documentKindOverride`, and `effectiveDocumentKind`.
- ZIP preset export remains compatible because it reuses safe exporters.

Exports still avoid API keys, prompts, raw model output, full original document text, `data/settings`, and local absolute paths.

## Regression

Added:

```bash
npm run test:document-kind
```

The test uses pure text fixtures for:

- paper
- interview
- business report
- fiction
- manual
- article
- interview-like fiction dialogue
- business-report-like article
- manual-like technical article

For local parsed document JSON files:

```bash
npm run test:document-kind-real
```

The real-sample script reads `data/documents/*.json` in a safe, read-only way. It prints ids, titles, inferred kind, confidence, text length, outline count, and detection reasons without printing full document text or reading API keys.

Current result:

```text
9 passed, 0 failed
```

## Current Limits

- Heuristic only; not guaranteed to be perfect.
- No LLM classification.
- No override history or bulk document-kind editing yet.
- No OCR, EPUB, or Word support.
- Fiction vs book chapter can still be ambiguous.
- Articles with sparse text may be marked `unknown`.
- Real PDFs still need manually annotated expected labels for stronger accuracy measurement.
