# Phase 4F.1: Document Kind Real-Sample Validation

Phase 4F.1 validates the heuristic document-kind detector against local parsed document JSON files and strengthens confusing cases without introducing LLM calls, OCR, embeddings, or a machine-learning classifier.

## Scope

- Read existing `data/documents/*.json` files in a safe, read-only way.
- Do not print full `document.text`.
- Do not copy real PDFs into the repository.
- Do not read API keys or local LLM settings.
- Tune only explainable heuristic rules.

## Added Script

```bash
npm run test:document-kind-real
```

The script prints only:

- document id
- title / filename
- stored kind
- inferred kind
- confidence
- expected kind if a local annotation file exists
- text length
- outline node count
- detection reasons

Optional expected labels can be placed in:

```text
.tools/test-fixtures/document-kind/expected-real-samples.json
```

The optional label file is not required for CI-style regression.

## Real / Local Sample Result

Current local run checked 18 parsed document JSON files.

Observed results:

- Academic-looking PDFs with Abstract / References / citation signals are inferred as `paper`.
- Short synthetic `text.pdf` samples with insufficient signal are inferred as `unknown`.
- A technical-looking PDF with installation / configuration / troubleshooting signals is inferred as `manual`.
- A literary / essay-like local sample that previously risked being over-classified as `manual` now falls back to `unknown` with low confidence.

No local samples were annotated with expected labels during this phase, so the script reports them as manually reviewable rather than pass/fail real labels.

## Confusion Cases Added

The regression script now includes confusing near-real text fixtures:

- interview-like fiction dialogue: expected `fiction`
- business-report-like article: expected `article`
- manual-like technical article: expected `article`

These cases protect against over-classifying generic prose simply because it mentions business metrics, configuration, or dialogue.

## Rule Tuning

Tuning completed in `src/lib/documentKindDetector.ts`:

- Cleaned document-kind labels and reason strings.
- Added clearer Chinese / English signal matching.
- Reduced interview false positives for fictional dialogue.
- Reduced business-report false positives when text explicitly says it is an article, essay, or not a formal company report.
- Reduced manual false positives when text explicitly says it has no step-by-step instructions, command reference, or parameter table.
- Tightened manual signals so isolated words such as `note` or `configuration` do not dominate.
- Added article / essay / opinion signals so mixed explanatory prose can remain `article` with low or medium confidence.

## Regression Result

```text
npm run test:document-kind
Summary: 9 passed, 0 failed.
```

```text
npm run test:document-kind-real
Summary: 18 samples checked, 0 annotated, 0 expected matches.
```

## Still Pending

The following true real-PDF sample categories still need manual expected labels:

- Chinese interview / dialogue article
- English interview transcript
- Enterprise annual report or white paper
- Fiction excerpt
- Book chapter
- Product manual
- General long-form article

## Current Limits

- Classification is heuristic and best-effort.
- Hybrid documents may remain low-confidence.
- `unknown` is preferred when signals are too sparse or ambiguous.
- Phase 4F.2 adds a local user override for document kind; this helps correct persistent ambiguous cases without changing the automatic detection record.
