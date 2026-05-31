# Phase 2A.2 MiniMax Token Plan

DocuMuse supports MiniMax Token Plan through the MiniMax OpenAI-compatible Chat Completions endpoint.

## Recommended Settings

In DocuMuse, open API Settings and choose:

```text
Provider: MiniMax Token Plan
Base URL: https://api.minimaxi.com/v1
Model: MiniMax-M2.7
Temperature: 1.0
```

Supported model options in the UI:

- `MiniMax-M2.7`
- `MiniMax-M2.7-highspeed`
- `MiniMax-M2.5`
- `MiniMax-M2.5-highspeed`
- `MiniMax-M2.1`
- `MiniMax-M2.1-highspeed`
- `MiniMax-M2`

## Token Plan Key

MiniMax Token Plan Key is used for Token Plan quota and credits. It is not interchangeable with MiniMax pay-as-you-go API Key.

Get the key from MiniMax subscription management / Token Plan, then paste it into DocuMuse API Settings.

## Compatibility Scope

DocuMuse currently uses the OpenAI-compatible MiniMax endpoint:

```text
POST https://api.minimaxi.com/v1/chat/completions
```

Anthropic-compatible MiniMax mode is not implemented in this phase.

## Reasoning Content

MiniMax responses may include `<think>...</think>` reasoning blocks. DocuMuse strips these blocks before JSON parsing, so reasoning content is not shown in the UI or saved to document JSON.

## Connection Test vs Analysis

The API Settings connection test only verifies that the configured provider, Base URL, key, and model can return non-empty text. It does not require the model to return JSON.

Document analysis still requires structured JSON because the workspace panels need summary, translation, section analysis, and creative output fields. If the model returns plain text during analysis, DocuMuse reports a clear JSON parsing error and does not save the invalid content.

For MiniMax responses, DocuMuse removes `<think>...</think>` content before checking test output or parsing analysis JSON.

## Security

- The full Token Plan Key is stored only in local server config: `data/settings/llm-config.json`.
- The UI receives only a masked key.
- The key is not saved to document JSON.
- The key is not logged.
