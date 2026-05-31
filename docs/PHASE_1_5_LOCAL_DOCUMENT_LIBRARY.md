# Phase 1.5 Local Document Library

DocuMuse Phase 1.5 adds a small local document library on top of the Phase 1 PDF parsing flow.

## What Works

- Upload a local PDF with selectable text.
- Store the original PDF in `data/uploads/`.
- Store parsed document JSON in `data/documents/`.
- Read local documents on the home page.
- Reopen parsed documents from the recent documents list.
- Delete a local document, including its parsed JSON and uploaded PDF when available.
- Keep `/documents/demo` working with mock data.

## API Routes

- `GET /api/documents`
  - Lists parsed local documents.
  - Omits full `text` to keep the home page light.
  - Sorts by `createdAt` descending.

- `POST /api/documents/upload`
  - Uploads a PDF.
  - Extracts text locally.
  - Saves document JSON and redirects to `/documents/{id}`.

- `GET /api/documents/[id]`
  - Reads one parsed document JSON.

- `DELETE /api/documents/[id]`
  - Deletes the parsed JSON.
  - Deletes the uploaded PDF when `uploadPath` is present.

## Data Storage

Parsed document JSON files live in:

```text
data/documents/
```

Uploaded PDF files live in:

```text
data/uploads/
```

Both folders are local-only and are not backed by a database or cloud storage.

## Limitations

- No OCR for scanned PDFs.
- No LLM-generated summary, translation, graph, chat, PPT, audio, or image output yet.
- No authentication or multi-user isolation.
- No database; deleting files is local filesystem deletion.
