# Validation Checklist

Use this checklist before tagging a release or sharing a demo build.

## Setup

- [ ] Run `npm install`.
- [ ] Run `npm run dev`.
- [ ] Open `http://localhost:3000`.
- [ ] Run `npm run build`.
- [ ] Open `http://localhost:3000/settings/validation`.
- [ ] Run `npm run test:outline`.
- [ ] Run `npm run test:document-kind`.
- [ ] Run `npm run test:document-kind-real` when local parsed documents are available.

## Passed Real Model Validation

- [x] MiniMax Token Plan / MiniMax-M2.7 / PDF analysis / document chat.

## Passed PPTX Visual Validation

- [x] Phase 3B.1.1 PPTX opened successfully in WPS / PowerPoint.
- [x] Chinese slide titles, row-based cover metadata, readable Summary, card-based Key Points, Keywords, Section Analysis, PPT Outline, Podcast Script, Image Prompts, and Document Q&A pages were visually checked.
- [x] No `undefined`, `null`, `[object Object]`, API key, prompt, raw output, or full original text leakage was observed.

## Passed Structured PDF Runtime Validation

- [x] Phase 4A.1 selectable-text PDF upload wrote `pages`, `paragraphs`, `sections`, and `parseDiagnostics`.
- [x] Phase 4A.1 Markdown, JSON, PPTX, chat-only Markdown, and preset ZIP exports returned 200 for a newly uploaded structured document.
- [x] Phase 4A.1 old pre-structured document JSON opened and exported through fallback paths.
- [x] Phase 4A.1 non-PDF and blank PDF uploads returned JSON errors.
- [x] Phase 4B selectable-text PDF upload wrote `qualityScore`, `qualityLabel`, `languageGuess`, and `pageDiagnostics`.
- [x] Phase 4B JSON export includes safe parse diagnostics and does not include full document text.
- [x] Phase 4C paragraph quality metadata is added for new uploads and runtime fallback.
- [x] Phase 4C low-value paragraph counts are included in safe parse diagnostics.
- [x] Phase 4D.0 fixture upload wrote `coordinateDiagnostics`, `pdfTextItems`, and `paragraphPositions`.
- [x] Phase 4D.0 JSON export includes safe coordinate diagnostics and does not export full `pdfTextItems`.
- [x] Phase 4D.1 source cards and original text paragraphs can display coordinate status when coordinate metadata is available.
- [x] Phase 4D.2 PDF file API returns `application/pdf` for uploaded documents and JSON 404 for demo / missing documents.
- [x] Phase 4D.3 headless browser smoke test confirmed PDF canvas rendering, overlay rendering, diagnostics, and 150% zoom synchronization.
- [x] Phase 4D.4 coordinate fixture script validates `simple-one-page.pdf` text items, paragraph positions, and positive bounding boxes.
- [x] Phase 4D.5 coordinate fixture script validates active one-page, multi-page, dense paragraph, and two-column fixtures.
- [x] Phase 4E build validation passed for heuristic outline extraction, outline-aware sidebar navigation, source metadata, chunk metadata, and safe exports.
- [x] Phase 4E.1 runtime upload fixture produced 8 outline nodes, detected abstract / introduction / conclusion / references, and verified safe JSON / Markdown / PPTX / ZIP export endpoints.
- [x] Phase 4E.2 outline regression script passed Chinese paper, Chinese report, English paper, and English report near-real fixtures.
- [x] Phase 4E.3 existing local real-PDF spot checks reduced numbered-heading false positives while preserving outline-aware source and chunk metadata.
- [x] Phase 4E.4 editable outline schema, APIs, sidebar edit UI, paragraph-to-heading action, effective-outline search/chunking/export paths, and build validation are implemented.
- [x] Phase 4E.5 editable outline API runtime-equivalent validation passed, including hidden/manual effective-outline behavior and export compatibility.
- [x] Phase 4E.6 editable outline UX build validation passed for up/down ordering, manual-heading insert position, unsaved-change prompts, edit summaries, and outline quality warnings.
- [x] Phase 4E.7 runtime-equivalent downstream validation passed for custom outline order, renamed / hidden / manual nodes, search metadata, chunking, Markdown / JSON, PPTX, and ZIP.
- [x] Phase 4E.7.1 user-completed browser validation passed for editable outline entry, rename, hide, level/type edits, up/down ordering, persistence, cancel prompt, reset, manual headings, source navigation, exports, demo, and old documents.
- [x] Phase 4F document-kind regression script passed paper, interview, business report, fiction, manual, and article fixtures.
- [x] Phase 4F.1 document-kind regression passed nine fixtures, including interview-like fiction, business-report-like article, and manual-like technical article.
- [x] Phase 4F.1 local parsed-document review checked 18 document JSON files without printing full document text.
- [x] Phase 4F.2 build validation passed for manual document-kind override API, topbar dialog, overview display, prompt usage, and safe exports.

## Upload And Library

- [ ] Upload a normal selectable-text PDF.
- [ ] Confirm redirect to `/documents/{id}`.
- [ ] Confirm original extracted text appears.
- [ ] Confirm new document JSON includes `pages`, `paragraphs`, `sections`, and `parseDiagnostics`.
- [ ] Confirm new document JSON includes `outline` and `outlineDiagnostics` when headings are detected.
- [ ] Confirm new document JSON includes `documentKind` with kind, confidence, reasons, detectedAt, and signal metadata.
- [ ] Confirm older documents without `documentKind` still open through runtime fallback.
- [ ] Confirm workspace topbar / overview display document kind, confidence, and reasons.
- [ ] Use `修改类型` to set a user document kind and confirm the workspace shows `用户设置`.
- [ ] Confirm `GET /api/documents/{id}/kind` returns auto, override, and effective kind.
- [ ] Reset document kind and confirm the workspace returns to automatic or fallback detection.
- [ ] Confirm merged-heading PDFs still produce outline nodes through inline heading detection.
- [ ] Confirm `npm run test:outline` reports 4 passed, 0 failed.
- [ ] Confirm `npm run test:document-kind` reports 9 passed, 0 failed.
- [ ] Confirm `npm run test:document-kind-real` prints only metadata, detection reasons, and lengths, not full document text.
- [ ] Spot-check at least one confidential real PDF and record outline false positives / missed headings without committing the PDF.
- [ ] Enter outline edit mode, rename a node, hide a node, change level/type, save, refresh, and confirm the custom outline persists.
- [ ] Use the outline editor up/down buttons and confirm saved order persists after refresh.
- [ ] Add a manual heading from an original-text paragraph.
- [ ] Add a manual heading after a selected existing outline node and confirm it appears in that position.
- [ ] Modify the outline, click cancel, and confirm the unsaved-change warning appears.
- [ ] Confirm the edit summary shows renamed, hidden, and manual node counts.
- [ ] Confirm outline quality warnings appear gently when diagnostics indicate an incomplete or low-confidence automatic outline.
- [x] Complete full browser click-through for Phase 4E.7 on a real document once local `npm run dev -- -p 3031` is reachable.
- [ ] Reset to the automatic outline and confirm custom edits are cleared.
- [ ] If every custom outline node is hidden, confirm the sidebar does not fall back to automatic outline nodes.
- [ ] Confirm `parseDiagnostics` includes `qualityScore`, `qualityLabel`, `languageGuess`, and `pageDiagnostics`.
- [ ] Confirm original text reader shows page count, paragraph count, section count, and parser warnings.
- [ ] Confirm original text reader can highlight detected heading paragraphs.
- [ ] Confirm original text reader shows parse quality, score, language guess, and collapsible diagnostics.
- [ ] Confirm paragraphs can show low-value tags such as page number, header/footer candidate, footnote candidate, or reference candidate.
- [ ] Confirm `隐藏低价值段落` hides low-value paragraph cards without deleting original text.
- [ ] Confirm new document JSON can include `coordinateDiagnostics`, `pdfTextItems`, and `paragraphPositions`.
- [ ] Confirm original text reader shows PDF coordinate layer availability and positioned/unpositioned paragraph counts.
- [ ] Confirm original text reader shows coordinate positioning rate.
- [ ] Expand a paragraph coordinate detail and confirm page number, confidence, and bounding box are shown.
- [ ] Open the `PDF 预览` tab for a real uploaded PDF.
- [ ] Confirm the first page renders in the experimental canvas preview.
- [ ] Use previous / next page controls.
- [ ] Use 90% / 100% / 125% / 150% zoom controls and confirm the canvas still renders.
- [ ] Expand PDF coordinate diagnostics and confirm raw bounding box, overlay box, confidence, and warning fields are visible.
- [ ] Run `npm run test:pdf-coordinates`.
- [ ] Confirm `simple-one-page.pdf`, `simple-multipage.pdf`, `dense-paragraphs.pdf`, and `two-column.pdf` pass.
- [ ] Confirm planned pending fixtures are reported as pending, not failed.
- [ ] Confirm old document JSON files without structured fields still open through runtime fallback.
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
- [ ] Confirm full-analysis chunks can include `outlineNodeId` and `outlineTitle` when an outline is available.
- [ ] Confirm full-analysis chunks use custom outline headings when `outlineEditState.mode` is `custom`.
- [ ] Confirm analysis prompts receive document-kind hints without making an extra classification LLM call.
- [ ] Confirm analysis prompts use the user override when `documentKindOverride` exists.
- [ ] Confirm chunk metadata can include `skippedLowValueParagraphCount`.
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
- [ ] Confirm source cards show page / paragraph hints when available.
- [ ] Confirm source cards show outline / chapter title metadata when available.
- [ ] Confirm hidden custom outline nodes do not appear in source hints.
- [ ] Confirm source cards avoid obvious page numbers and repeated headers/footers where possible.
- [ ] Confirm source cards can show coordinate availability or approximate coordinate confidence when available.
- [ ] Expand source coordinate details and confirm page number, confidence, and bounding box are shown.
- [ ] Use `复制定位信息` and confirm it copies page / paragraph / bounding-box metadata.
- [ ] For a coordinate-aware source, click `在 PDF 中查看`.
- [ ] Confirm the workspace switches to `PDF 预览` and draws a translucent highlight rectangle.
- [ ] Confirm a source from another page does not show an overlay on the wrong page and instead shows a page mismatch hint.
- [ ] Confirm assistant answers render Markdown headings, bold text, lists, blockquotes, and inline code.
- [ ] Confirm raw Markdown markers such as `**bold**` are not shown for supported syntax.
- [ ] Copy an assistant answer.
- [ ] Open expanded reading for an assistant answer.
- [ ] Click a source and confirm the original text tab opens.
- [ ] Confirm the matching paragraph is highlighted.
- [ ] Confirm workspace sidebar outline shows detected sections for structured documents.
- [ ] Confirm workspace sidebar prefers detected outline nodes when `outline` is available.
- [ ] Click an outline node and confirm the original text tab opens and highlights the target paragraph.
- [ ] Clear highlight.
- [ ] Clear chat history.
- [ ] Refresh and confirm chat history remains empty.
- [ ] Export chat Markdown from ChatPanel.
- [ ] Confirm exported Markdown contains questions, answers, and short source quotes only.

## Workspace Export

- [ ] Open a real document workspace.
- [ ] Export Markdown from the top bar.
- [ ] Confirm the Markdown contains metadata, summaries, key points, section analysis, creative outputs, and Q&A records when available.
- [ ] Confirm the Markdown can include the detected document outline.
- [ ] Confirm Markdown export uses the effective outline when a custom outline exists.
- [ ] Confirm Markdown export can include safe document-kind metadata.
- [ ] Export structured JSON from the top bar.
- [ ] Confirm the JSON does not contain full `text`, API keys, prompts, raw model output, or `analysisDiagnostics.rawPreview`.
- [ ] Confirm the JSON can include safe `outline` and `outlineDiagnostics` without full original text.
- [ ] Confirm JSON export includes safe `outlineEditState` summary and `effectiveOutline`, without full original text.
- [ ] Confirm JSON export includes safe `documentKind` metadata.
- [ ] Confirm JSON export includes safe `documentKindOverride` and `effectiveDocumentKind`.
- [ ] Export Q&A-only Markdown from the top bar.
- [ ] Export PPTX from the top bar.
- [ ] Open the PPTX in PowerPoint or WPS.
- [ ] Confirm title, summary, key points, section analysis, PPT outline, Q&A, and closing slides render.
- [ ] Confirm PPTX layout uses readable card spacing, clear titles, tags, and pagination.
- [ ] Confirm slide titles are Chinese-first: 摘要, 核心观点, 关键词, 分段分析, PPT 大纲, 播客脚本, 图片提示词, 文档问答.
- [ ] Confirm cover metadata is shown in separate rows and does not squeeze into one dense line.
- [ ] Confirm Summary, Section Analysis, Podcast Script, and Q&A slides do not feel overfilled.
- [ ] Confirm Q&A answers and sources are visually separated.
- [ ] Confirm PPTX metadata can show the detected document kind.
- [ ] Confirm PPTX metadata uses the effective document kind when a user override exists.
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

## Export Presets

- [ ] Open a real document workspace.
- [ ] Click `导出预设`.
- [ ] Confirm five presets are shown: 学习笔记包, 汇报材料包, 研究摘录包, 播客准备包, 完整归档包.
- [ ] Export 学习笔记包 and confirm one ZIP downloads.
- [ ] Export 汇报材料包 and confirm one ZIP downloads.
- [ ] Export 完整归档包 and confirm one ZIP downloads.
- [ ] Extract ZIP files and confirm expected files are present.
- [ ] Confirm existing single-file Markdown, JSON, PPTX, and Q&A exports still work.
- [ ] Confirm preset files do not contain API keys, prompts, raw output, full original text, `data/settings`, `uploadPath`, or `analysisDiagnostics.rawPreview`.

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
