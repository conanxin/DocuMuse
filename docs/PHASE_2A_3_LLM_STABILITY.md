# Phase 2A.3 LLM Analysis Stability

This phase hardens the document analysis flow for OpenAI-compatible providers, especially models that may return non-standard JSON around otherwise useful content.

## JSON Extraction

DocuMuse now parses analysis responses with a layered strategy:

1. Remove MiniMax-style `<think>...</think>` reasoning blocks.
2. Try to parse the full response as a JSON object.
3. If that fails, extract and parse a fenced `json` code block.
4. If that fails, parse the content between the first `{` and the last `}`.
5. If no valid JSON object can be recovered, return: `模型没有返回有效 JSON，请重新生成或更换模型。`

Reasoning content is never shown in the UI and is not saved to document JSON.

## Normalization

The analysis result is normalized before saving:

- Missing string fields become empty strings.
- Missing array fields become empty arrays.
- `keyPoints`, `keywords`, `sectionSummaries`, `pptOutline`, and `imagePrompts` are always arrays.
- `sectionSummaries[].keyPoints`, `sectionSummaries[].quotes`, and `pptOutline[].bullets` are always arrays.
- `translationZh` is always a string.

## Status And Metadata

Successful analysis saves:

- `analysisStatus: "completed"`
- `analyzedAt`
- `analysisInputChars`
- `analysisModel`
- `analysisProvider`
- `analysisTruncated`

Failed analysis saves:

- `analysisStatus: "failed"`
- `analysisError`

The saved error is short and does not include stack traces or API keys.

## Retry Strategy

DocuMuse retries once for transient failures:

- Network errors
- Timeout
- HTTP `502`, `503`, or `504`
- Model output that is not valid JSON

DocuMuse does not retry for:

- Missing API Key
- Invalid key or permission errors
- Missing quota or unavailable Token Plan resources
- Wrong model or Base URL errors such as `404`
- Rate limit errors

## Current Limits

- Long documents are still analyzed from the front portion of the extracted text.
- There is no RAG or vector database yet.
- Document chat is still a placeholder.
- PPT, image, and audio outputs are structured text only, not generated files or media.
