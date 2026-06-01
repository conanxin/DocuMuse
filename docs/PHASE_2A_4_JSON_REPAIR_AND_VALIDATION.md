# Phase 2A.4 JSON Repair And Validation

This phase improves real-model validation for DocuMuse document analysis without adding RAG, document chat, media generation, or file export.

## Why JSON Repair Exists

OpenAI-compatible models can return useful content in formats that are not directly parseable by the workspace:

- JSON wrapped in explanatory text.
- JSON inside Markdown code fences.
- MiniMax `<think>...</think>` reasoning blocks before the answer.
- Nearly valid JSON with missing fields or minor formatting issues.
- Truncated or incomplete JSON.

DocuMuse needs structured JSON so the overview, translation, section analysis, and creative output panels can render consistently.

## Parser Strategy Order

The analysis pipeline uses this order:

1. Strip `<think>...</think>` reasoning content.
2. Try to parse the full response as one JSON object.
3. Try to parse a fenced `json` code block.
4. Try to parse the content between the first `{` and the last `}`.
5. Normalize the parsed object into the required analysis shape.
6. If parsing still fails, call the same LLM once with a JSON repair prompt.
7. Parse and normalize the repaired output.
8. If repair fails, return: `模型没有返回有效 JSON，且自动修复失败。请重试或更换模型。`

There is no infinite retry loop. The maximum path is the original analysis call, one lightweight retry for transient failures, and one repair call.

## Repair Prompt Strategy

The repair prompt receives a safe truncated preview of the first model output, up to 12,000 characters. It includes the target JSON schema and asks the model to:

- Return JSON only.
- Avoid Markdown and explanations.
- Avoid inventing facts outside the model output.
- Fill missing string fields with empty strings.
- Fill missing array fields with empty arrays.
- Prefer Chinese when recoverable content exists.

## Diagnostics

Document JSON can include:

```ts
analysisDiagnostics?: {
  parserStrategy?: "direct" | "code_block" | "brace_extract" | "repair" | "failed";
  repairedJson?: boolean;
  provider?: string;
  model?: string;
  inputChars?: number;
  outputChars?: number;
  errorType?: string;
  rawPreview?: string;
}
```

Security limits:

- No API Key is saved.
- No complete prompt is saved.
- No complete PDF text is saved in diagnostics.
- No complete raw model output is saved.
- `rawPreview` is stripped of `<think>` content and capped at 300 characters.

## Status Endpoint

Development diagnostics are available at:

```text
GET /api/documents/{id}/analysis-status
```

It returns analysis status, timestamps, model/provider metadata, truncation status, and diagnostics. It does not return full document text or secrets.

## How To Test OpenAI-Compatible Providers

1. Open API Settings.
2. Choose OpenAI or OpenAI Compatible.
3. Configure API Key, Base URL, model, and temperature.
4. Click Test Connection.
5. Open a parsed document and click Start Analysis.
6. Confirm the document JSON saves `analysisStatus: "completed"` or a clear `failed` error.

## How To Test MiniMax Token Plan

1. Open API Settings.
2. Choose MiniMax Token Plan.
3. Use `https://api.minimaxi.com/v1`.
4. Use `MiniMax-M2.7` or another supported model.
5. Save a Token Plan Key.
6. Click Test Connection. This only requires non-empty text, not JSON.
7. Start document analysis. This requires structured JSON and may trigger one automatic repair pass.

## Current Limits

- Long documents still analyze only the front portion of extracted text.
- No RAG or vector database is implemented.
- Document chat remains a placeholder.
- PPT, image, and audio outputs are structured text only.
