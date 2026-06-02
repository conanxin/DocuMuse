# Phase 3B.2 PPTX Export Options

## Goal

Phase 3B.2 adds lightweight PPTX export controls on top of the stable PPTX exporter. Users can choose a theme color, cover style, and which content sections to include before downloading a deck.

This phase does not call an LLM, generate images, create audio, use RAG, use embeddings, add animations, load external template files, or change API key storage.

## Export API

The existing route supports PPTX options through query parameters:

```text
GET /api/documents/[id]/export?format=pptx
  &theme=blue|green|purple|slate
  &cover=standard|minimal|report
  &includeSummary=true
  &includeKeyPoints=true
  &includeKeywords=true
  &includeSections=true
  &includeOutline=true
  &includeCreative=true
  &includeChat=true
```

Defaults:

- `theme=blue`
- `cover=report`
- all include flags are `true`

Invalid `theme` or `cover` values fall back to defaults. Include flags support `true` and `false`.

Markdown, JSON, and chat-only Markdown exports keep their existing behavior.

## Types

`src/lib/exporters/exportTypes.ts` defines:

- `PptxThemeName`
- `PptxCoverStyle`
- `PptxExportOptions`

## Themes

Supported themes:

- Blue: default DocuMuse blue.
- Green: emerald report style.
- Purple: violet report style.
- Slate: neutral deep-gray report style.

Themes affect slide titles, accent borders, keyword tags, and decorative blocks while preserving readable body text.

## Cover Styles

Supported cover styles:

- `standard`: left title with a right-side decorative block.
- `minimal`: fewer decorative elements and a larger title.
- `report`: document metadata card plus keyword preview.

## Section Selection

The PPTX exporter can include or skip:

- Summary.
- Key points.
- Keywords.
- Section analysis.
- PPT outline.
- Creative outputs.
- Document Q&A.

The cover slide and closing slide are always included. If every include flag is false, the generated deck still contains cover and closing slides.

## Frontend

The workspace top bar PPTX button opens an export dialog with:

- Theme selector.
- Cover style selector.
- Section checkboxes.
- Cancel and Export PPTX actions.

The dialog builds the export query string and uses the existing download flow.

## Security

PPTX export still excludes:

- API keys.
- Prompts.
- Raw model output.
- Full original document text.
- `analysisDiagnostics.rawPreview`.
- `data/settings`.
- Absolute upload paths.
- Full chunk text.

## Current Limits

- No external templates.
- No brand-kit editor.
- No generated or inserted images.
- No animations.
- No speaker notes.
- No complex template editor.
