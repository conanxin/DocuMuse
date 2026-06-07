# Phase 4F.2: Manual Document Kind Override

Phase 4F.2 lets users manually correct DocuMuse's automatic document-kind detection while preserving the original automatic result.

## Goal

Automatic kind detection remains stored in:

```text
documentKind
```

User corrections are stored separately in:

```text
documentKindOverride
```

The workspace, prompts, and exports use the effective kind:

1. user override
2. automatic detection
3. runtime fallback detection

## Schema

```ts
export interface DocumentKindOverride {
  kind: DocumentKind;
  reason?: string;
  updatedAt: string;
  source: "user";
}
```

Document JSON may contain:

```ts
documentKindOverride?: DocumentKindOverride;
```

This does not overwrite `documentKind`.

## Effective Kind

`getEffectiveDocumentKind(document)` returns:

```ts
{
  kind,
  confidence,
  reasons,
  source: "auto" | "user" | "fallback",
  auto,
  override
}
```

When a user override exists, confidence is treated as `high` and the reason notes that the type was manually set.

## API

```text
GET    /api/documents/[id]/kind
PUT    /api/documents/[id]/kind
DELETE /api/documents/[id]/kind
```

GET returns:

```json
{
  "ok": true,
  "auto": {},
  "override": {},
  "effective": {}
}
```

PUT body:

```json
{
  "kind": "interview",
  "reason": "User confirmed this is an interview transcript."
}
```

DELETE clears only `documentKindOverride` and returns to automatic or fallback detection.

The API does not return full document text, API keys, prompts, or raw model output.

## UI

The workspace topbar now shows:

- effective document kind
- source: automatic detection, user setting, or fallback inference
- confidence
- a `修改类型` action for real documents

The dialog supports:

- selecting document kind
- optional correction reason
- saving the override
- resetting to automatic detection

The overview panel shows effective kind, source, confidence, automatic kind when overridden, and expandable reasons.

## Prompt And Export Integration

Analysis and chat prompts use the effective kind. For example, if automatic detection says `article` but the user sets `fiction`, the prompt uses the fiction hint.

Exports use the effective kind:

- Markdown metadata shows effective kind and source.
- JSON includes automatic `documentKind`, `documentKindOverride`, and `effectiveDocumentKind`.
- PPTX metadata shows the effective kind.
- ZIP exports remain compatible because they reuse the existing safe exporters.

## Compatibility

- Older documents without `documentKind` still use runtime fallback.
- Older documents can save `documentKindOverride`.
- Resetting override returns to auto or fallback.
- Demo documents do not call the save API.

## Current Limits

- No bulk kind editing.
- No history of previous overrides.
- No collaborative review or cloud sync.
- No LLM or machine-learning classifier is used.
