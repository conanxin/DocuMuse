# Phase 4B: Parse Diagnostics

Phase 4B strengthens DocuMuse's PDF text-layer diagnostics without adding OCR, new PDF parser dependencies, LLM calls, image parsing, or table recognition.

## Implemented

- Parse quality score from `0` to `100`.
- Parse quality label: `good`, `fair`, `poor`, or `unknown`.
- Page-level diagnostics:
  - page number
  - text length
  - paragraph count
  - empty page flag
  - low text density flag
  - repeated header/footer candidates
- Better scanned / low text-layer suspicion.
- Repeated page header/footer candidate detection.
- Heading candidate count.
- Reference section detection.
- Footnote candidate count.
- Lightweight language guess: `zh`, `en`, `mixed`, or `unknown`.
- Original text UI shows quality, score, language, warnings, and collapsible page diagnostics.
- Safe JSON export includes diagnostics metadata without full document text.

## Diagnostics Fields

New optional fields on `parseDiagnostics`:

```ts
qualityScore?: number;
qualityLabel?: "good" | "fair" | "poor" | "unknown";
pageDiagnostics?: PageDiagnostics[];
repeatedLineCandidates?: string[];
suspectedHeaderFooterLines?: string[];
suspectedReferenceSection?: boolean;
suspectedFootnoteCount?: number;
headingCandidateCount?: number;
languageGuess?: "zh" | "en" | "mixed" | "unknown";
```

All fields are optional so old documents remain compatible.

## Quality Score

The quality score starts from `100` and applies heuristic deductions for:

- Very short extracted text.
- Low average characters per page.
- Many empty pages.
- Very few paragraphs in long documents.
- Too many repeated page-boundary lines.
- Strong scanned-PDF suspicion.

Labels:

- `80-100`: `good`
- `50-79`: `fair`
- `0-49`: `poor`
- unknown when the score cannot be determined

## Header / Footer Candidates

The detector inspects the first and last three lines of each page. Short repeated lines across multiple pages are flagged as possible page headers or footers.

Phase 4B only diagnoses these lines. It does not delete or rewrite extracted text.

## References And Footnotes

Lightweight heuristics detect:

- `References`
- `Bibliography`
- `参考文献`
- short numbered lines or `*`-prefixed lines as possible footnotes

These diagnostics do not alter analysis or retrieval behavior.

## Runtime Validation

Validated with `.tools/test-fixtures/text.pdf`:

```text
qualityScore: 85
qualityLabel: good
languageGuess: en
pageDiagnostics: present
JSON export: includes safe parseDiagnostics
JSON export: does not include full text
blank PDF: still returns OCR / no text-layer JSON error
```

## Security

Diagnostics do not store:

- API keys
- prompts
- raw model output
- full original text in JSON export
- local settings paths

## Current Limitations

- No OCR.
- No PDF coordinate extraction.
- Header/footer detection is heuristic.
- Section and heading detection are heuristic.
- Footnote detection is approximate.
- Page boundaries may be approximate when the PDF parser does not expose reliable page text.

## Phase 4C Follow-Up

Phase 4C uses these diagnostics to mark paragraph-level quality and reduce the impact of obvious page headers, footers, page numbers, and very short low-value text in retrieval and full-analysis chunking.

The original extracted text remains unchanged for traceability.
