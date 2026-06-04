# Phase 4C: Header/Footer Cleanup And Source Quality

Phase 4C uses Phase 4B diagnostics to improve retrieval, chunking, and source quality without deleting the original extracted text.

## Implemented

- Paragraph-level quality metadata.
- Page header/footer candidate marking.
- Page-number-only paragraph marking.
- Very short / symbol-only low-value paragraph marking.
- Footnote and reference paragraph hints.
- Search deweighting and filtering for low-value paragraphs.
- Full-analysis paragraph chunking skips obvious low-value paragraphs.
- Chat sources can carry source quality flags.
- Original text panel shows subtle quality tags.
- Original text panel has a `隐藏低价值段落` toggle.
- JSON export includes safe paragraph-quality statistics through `parseDiagnostics`.

## Paragraph Quality Metadata

Each structured paragraph can include:

```ts
quality?: {
  isRepeatedHeaderFooter?: boolean;
  isPageNumberOnly?: boolean;
  isVeryShort?: boolean;
  isLikelyFootnote?: boolean;
  isLikelyReference?: boolean;
  isLowValue?: boolean;
  reasons?: string[];
}
```

Old documents without this field still work. Runtime fallback calls `ensureDocumentStructure(document)` and annotates quality on generated paragraphs without rewriting old JSON files.

## Retrieval Strategy

Document chat retrieval:

- Skips low-value paragraphs when enough normal paragraphs exist.
- Strongly deweights page numbers, repeated headers, repeated footers, and very short low-value text.
- Slightly deweights likely footnotes and reference sections, but does not remove them.
- Falls back to available text when filtering would otherwise produce no sources.

## Chunking Strategy

Full document chunking:

- Skips page-number-only paragraphs.
- Skips repeated header/footer candidates.
- Skips very short low-value paragraphs.
- Keeps likely reference content unless it is also otherwise low-value.
- Records `skippedLowValueParagraphCount` in chunk metadata.

## Original Text UI

The original text reader now:

- Shows low-value paragraph counts in diagnostics.
- Shows repeated header/footer paragraph counts.
- Shows page-number paragraph counts.
- Displays subtle tags on low-value / footnote / reference candidates.
- Provides a `隐藏低价值段落` toggle.

The toggle only hides cards in the UI. It does not delete or rewrite original text.

## Export Compatibility

- Markdown export does not need paragraph quality by default.
- JSON export includes safe diagnostics counters.
- JSON export does not include full `text` by default.
- PPTX and ZIP exports continue using the existing safe export paths.

## Current Limitations

- No OCR.
- No PDF coordinate-level positioning.
- Header/footer and low-value detection are heuristic.
- Very noisy PDFs may still produce imperfect paragraph quality labels.
- Original text is intentionally preserved for traceability.
