# Phase 4E.2: Outline Validation With Chinese / English Near-Real Fixtures

Phase 4E.2 validates heuristic outline extraction against multiple near-real PDF fixture styles.

This phase does not call LLMs, does not perform OCR, and does not introduce machine-learning heading detection.

## Fixture Scope

The validation script generates small local PDFs under:

```text
.tools/test-fixtures/outline/
```

These files are near-real fixtures, not downloaded real-world documents.

Covered fixture types:

| Fixture | Type | Coverage |
| --- | --- | --- |
| `zh-paper-outline.pdf` | Chinese paper-style | 摘要, 引言, numbered method / result, 结论, 参考文献 |
| `zh-report-outline.pdf` | Chinese report-style | 一、二、三、（一）（二）, 结论, 附录 |
| `en-paper-outline.pdf` | English paper-style | Abstract, Introduction, Method, Results, Conclusion, References |
| `en-report-outline.pdf` | English report-style | 1. Introduction, 1.1 Background, 2. Analysis, 3. Recommendations, Appendix |

## Validation Script

Run:

```bash
npm run test:outline
```

The script:

- Generates the near-real PDF fixtures locally with Microsoft Edge headless printing.
- Extracts text items with `pdfjs-dist`.
- Builds lightweight page / paragraph structures.
- Calls `extractDocumentOutline`.
- Reports node count, max depth, top-level nodes, missing required types, false positives, and warnings.

Latest result:

```text
[passed] zh-paper-outline.pdf nodes=7 depth=2
[passed] zh-report-outline.pdf nodes=7 depth=2
[passed] en-paper-outline.pdf nodes=8 depth=2
[passed] en-report-outline.pdf nodes=6 depth=2

Summary: 4 passed, 0 failed.
```

## Rule Tuning

Rules tightened in this phase:

- Standard numbered headings such as `1 Introduction` and `1. Introduction` can infer special types like `introduction`.
- Chinese direct heading rules now use stable Unicode escape patterns.
- Weak short-line heading detection was narrowed to English title-like lines only.
- Body text fragments containing `conclusion` or `introduction` are less likely to be false positives.
- The outline validation script merges split numbered heading lines such as `1.` + `方法`.

## Source And Chunking Checks

No LLM call is needed.

Expected behavior:

- `documentSearch` returns source metadata with `outlineNodeId`, `outlineTitle`, and `outlineType`.
- Source hints can include page + outline title + paragraph.
- `textChunker` prefers outline boundaries when outline nodes are available.
- Documents without outline continue to fall back to paragraph chunking.

## Export Compatibility

Expected behavior remains unchanged:

- Markdown export can include the document outline.
- JSON export includes safe `outline` and `outlineDiagnostics`.
- PPTX and preset ZIP exports should not crash.
- Exports must not include API keys, prompts, raw output, full original text, `data/settings`, or absolute upload paths.

## Known Limits

- These are generated near-real fixtures, not complex production PDFs.
- True multi-column academic PDFs, rotated pages, CropBox / MediaBox differences, and scanned PDFs are not covered.
- Heading detection remains heuristic and can still miss unusual title styles.
- When PDF extraction merges multiple visible headings into one paragraph, source navigation may highlight the containing paragraph rather than a precise inline heading span.

## Follow-up

Phase 4E.3 extends this work with existing local real-PDF spot checks. The follow-up tuning applies the numbered-heading rejection rules to inline heading detection as well, reducing person-name footnotes, repeated page/header labels, and unit strings as false positives.
