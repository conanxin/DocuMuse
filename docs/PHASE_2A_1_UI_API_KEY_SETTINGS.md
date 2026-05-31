# Phase 2A.1 UI API Key Settings

Phase 2A.1 lets local users configure an OpenAI-compatible API connection from the DocuMuse API Settings dialog.

## Where Settings Are Stored

The server writes local settings to:

```text
data/settings/llm-config.json
```

This folder is ignored by git. Do not commit API keys.

## Configuration Priority

DocuMuse resolves LLM settings in this order:

1. UI local config in `data/settings/llm-config.json`
2. `.env.local`
3. Built-in defaults

If the UI config has an API key, it is used first. If the UI config has no API key, DocuMuse falls back to `OPENAI_API_KEY` from `.env.local`.

## MiniMax Token Plan

The API Settings dialog includes `MiniMax Token Plan` as a provider. Selecting it fills:

```text
Base URL: https://api.minimaxi.com/v1
Model: MiniMax-M2.7
Temperature: 1.0
```

MiniMax Token Plan Key is different from MiniMax pay-as-you-go API Key. Use the key from MiniMax subscription management / Token Plan.

## API Routes

- `GET /api/settings/llm`
  - Returns the effective config without exposing the full API key.

- `POST /api/settings/llm`
  - Saves provider, Base URL, model, temperature, and optionally a new API key.
  - If `apiKey` is empty, the existing local API key is preserved.

- `DELETE /api/settings/llm/key`
  - Removes the local UI-saved API key.
  - Keeps provider, Base URL, model, and temperature.

## Security Notes

- API keys are not saved to browser `localStorage`.
- Full API keys are never returned to the frontend.
- The UI only shows masked keys, such as `sk-****abcd`.
- API keys are not written to document JSON.
- API keys are not logged.

This local-file approach is intended for local development and single-user desktop-style use. For public multi-user deployment, add authentication, per-user encrypted secret storage, audit logging, and stronger operational controls.
