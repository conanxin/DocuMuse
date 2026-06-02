# Phase 3B.1.1 PPTX Visual Fixes

## Goal

Phase 3B.1.1 applies real visual feedback from exported PPTX files opened in WPS / PowerPoint. The goal is to make the generated deck feel closer to a deliverable Chinese reading report while still using only existing local document JSON.

This phase does not call an LLM, generate images, use audio, add animations, or load external templates.

## Fixes

### Chinese Slide Titles

Major slide titles now default to Chinese:

- 摘要
- 核心观点
- 关键词
- 分段分析
- PPT 大纲
- 播客脚本
- 图片提示词
- 文档问答

Short English subtitles are kept only as supporting labels where useful.

### Cover Metadata

The cover metadata card now uses one row per field:

- 文件
- 服务
- 模型
- 导出

Labels use gray text and values use darker text. Long filenames are truncated before export to avoid crowded wrapping.

### Text Cleaning

All PPTX text passes through `cleanPptText` before rendering. It normalizes undefined or null values, Markdown markers, excess blank lines, repeated spaces, redundant list markers, and awkward punctuation spacing around Chinese text.

Normal English terms such as MiniMax, Google, OpenAI, and Brown Corpus are preserved.

### Density Fixes

- Full summary is capped at 450 characters.
- Section summaries are capped at 160 characters.
- Section key points are capped at 80 characters.
- Podcast Script is capped at 600 characters and split into compact paragraphs.
- Image prompt text is capped at 150 characters.
- Q&A answers and source quotes are separated and shortened.

### Q&A Simplification

Document Q&A slides are less dense:

- Question capped at 80 characters.
- Answer capped at 220 characters.
- Sources are shown separately from the answer.
- At most 2 sources are shown.
- Source quotes are capped at 80 characters.
- Obvious `Source:` / `来源:` blocks are removed from the answer body before export.

## Security

The PPTX still excludes API keys, prompts, raw model output, full original document text, `analysisDiagnostics.rawPreview`, `data/settings`, absolute upload paths, and full chunk text.

## Visual Validation Result

Phase 3B.1.1 has passed local visual validation in WPS / PowerPoint.

Confirmed:

- PPTX downloads successfully.
- WPS / PowerPoint opens the deck normally.
- Slide titles are Chinese-first.
- Cover metadata is clear and row-based.
- Summary readability is improved.
- Key Points cards render normally.
- Keywords tags render normally.
- Section Analysis knowledge cards render normally.
- PPT Outline cards render normally.
- Podcast Script is no longer overly dense.
- Image Prompts pages render normally.
- Document Q&A density is improved.
- No `undefined`, `null`, or `[object Object]` was found.
- No API key, prompt, raw output, or full original text leakage was found.

## Current Limits

- Layout is template-based, not user-editable.
- No custom brand theme picker yet.
- No generated images are inserted into the PPTX.
- Source positioning is text-based, not PDF-coordinate based.
