# Validation Checklist

Use this checklist before tagging a release or sharing a demo build.

## Setup

- [ ] Run `npm install`.
- [ ] Run `npm run dev`.
- [ ] Open `http://localhost:3000`.
- [ ] Run `npm run build`.
- [ ] Open `http://localhost:3000/settings/validation`.

## Passed Real Model Validation

- [x] MiniMax Token Plan / MiniMax-M2.7 / PDF analysis / document chat.

## Passed PPTX Visual Validation

- [x] Phase 3B.1.1 PPTX opened successfully in WPS / PowerPoint.
- [x] Chinese slide titles, row-based cover metadata, readable Summary, card-based Key Points, Keywords, Section Analysis, PPT Outline, Podcast Script, Image Prompts, and Document Q&A pages were visually checked.
- [x] No `undefined`, `null`, `[object Object]`, API key, prompt, raw output, or full original text leakage was observed.

## Upload And Library

- [ ] Upload a normal selectable-text PDF.
- [ ] Confirm redirect to `/documents/{id}`.
- [ ] Confirm original extracted text appears.
- [ ] Return home and confirm the document appears in Recent Documents.
- [ ] Reopen the document from the local library.
- [ ] Delete a document and confirm it disappears.

## API Settings

- [ ] Open API Settings.
- [ ] Save an OpenAI-compatible API Key, Base URL, model, and temperature.
- [ ] Reopen API Settings and confirm only the masked key is shown.
- [ ] Test connection.
- [ ] Confirm validation page shows provider, model, base URL, masked key, and config source.
- [ ] Run validation page connection test.
- [ ] Select MiniMax Token Plan.
- [ ] Confirm Base URL defaults to `https://api.minimaxi.com/v1`.
- [ ] Confirm model defaults to `MiniMax-M2.7`.
- [ ] Save and test a MiniMax Token Plan Key.

## Analysis

- [ ] Run quick analysis on a short PDF.
- [ ] Run quick analysis from `/settings/validation`.
- [ ] Confirm analysis result is saved.
- [ ] Run full analysis on a longer PDF.
- [ ] Run full analysis from `/settings/validation`.
- [ ] Confirm chunks are created.
- [ ] Confirm chunk analyses are saved.
- [ ] Confirm global synthesis is saved.
- [ ] Confirm analysis progress is visible.
- [ ] Confirm JSON repair diagnostics appear when applicable.

## Document Chat

- [ ] Ask: `What is this document about?`
- [ ] Run document chat from `/settings/validation`.
- [ ] Confirm an LLM answer is returned.
- [ ] Confirm sources are shown.
- [ ] Confirm source quotes are short and relevant to the question.
- [ ] Confirm assistant answers render Markdown headings, bold text, lists, blockquotes, and inline code.
- [ ] Confirm raw Markdown markers such as `**bold**` are not shown for supported syntax.
- [ ] Copy an assistant answer.
- [ ] Open expanded reading for an assistant answer.
- [ ] Click a source and confirm the original text tab opens.
- [ ] Confirm the matching paragraph is highlighted.
- [ ] Clear highlight.
- [ ] Clear chat history.
- [ ] Refresh and confirm chat history remains empty.
- [ ] Export chat Markdown from ChatPanel.
- [ ] Confirm exported Markdown contains questions, answers, and short source quotes only.

## Workspace Export

- [ ] Open a real document workspace.
- [ ] Export Markdown from the top bar.
- [ ] Confirm the Markdown contains metadata, summaries, key points, section analysis, creative outputs, and Q&A records when available.
- [ ] Export structured JSON from the top bar.
- [ ] Confirm the JSON does not contain full `text`, API keys, prompts, raw model output, or `analysisDiagnostics.rawPreview`.
- [ ] Export Q&A-only Markdown from the top bar.
- [ ] Export PPTX from the top bar.
- [ ] Open the PPTX in PowerPoint or WPS.
- [ ] Confirm title, summary, key points, section analysis, PPT outline, Q&A, and closing slides render.
- [ ] Confirm PPTX layout uses readable card spacing, clear titles, tags, and pagination.
- [ ] Confirm slide titles are Chinese-first: 摘要, 核心观点, 关键词, 分段分析, PPT 大纲, 播客脚本, 图片提示词, 文档问答.
- [ ] Confirm cover metadata is shown in separate rows and does not squeeze into one dense line.
- [ ] Confirm Summary, Section Analysis, Podcast Script, and Q&A slides do not feel overfilled.
- [ ] Confirm Q&A answers and sources are visually separated.
- [ ] Open the PPTX export dialog and confirm theme, cover, and section options are available.
- [ ] Export with `theme=blue`, `theme=green`, `theme=purple`, and `theme=slate`.
- [ ] Export with `cover=standard`, `cover=minimal`, and `cover=report`.
- [ ] Disable chat / creative / section pages and confirm the generated deck omits them.
- [ ] Disable every content section and confirm the deck still contains cover and closing slides.
- [x] Route-level validation passed for the six requested Phase 3B.3 combinations: default blue/report, green/report, purple/standard, slate/minimal, compact export, and cover-only export.
- [x] Manually open all Phase 3B.3 option combinations in WPS / PowerPoint.
- [x] Confirm theme colors, cover styles, and include switches work in WPS / PowerPoint.
- [ ] Confirm PPTX does not show `undefined`, `null`, or `[object Object]`.
- [ ] Confirm empty analysis exports show `尚未生成分析结果`.
- [ ] Confirm empty chat exports show `暂无问答记录`.
- [ ] Confirm missing documents return JSON 404 from `/api/documents/{id}/export`.
- [ ] Open `/documents/demo` and confirm demo export does not crash.

## Failure Scenarios

- [ ] No API Key: test connection returns a clear JSON error.
- [ ] No API Key: analysis returns a clear JSON error.
- [ ] No API Key: document chat returns a clear JSON error.
- [ ] Fake API Key: returns a clear JSON error, not HTML 500.
- [ ] Non-PDF upload: returns a clear PDF-only error.
- [ ] Scanned PDF / no selectable text: returns an OCR limitation error.
- [ ] Blank PDF: returns a clear empty-text error.
- [ ] Analysis failure saves `analysisStatus: "failed"` and a short `analysisError`.

## Demo

- [ ] Open `/documents/demo`.
- [ ] Confirm mock overview, original text, graph, creative output, and chat still render.
- [ ] Confirm demo chat does not call real APIs.
