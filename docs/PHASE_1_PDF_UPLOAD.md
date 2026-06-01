# Phase 1 PDF Upload

Phase 1 added the first real local PDF pipeline.

## Implemented

- `POST /api/documents/upload`
- Multipart upload with field name `file`
- PDF-only validation
- Safe local filename handling
- Original PDF saved under `data/uploads/`
- Extracted document JSON saved under `data/documents/`
- Text extraction with `pdf-parse`
- Clear JSON errors for non-PDF, empty text, and unsupported scanned PDFs
- Redirect to `/documents/{id}` after upload

## Limits

- No OCR.
- No EPUB or Word support.
- No cloud upload.
- No database.
- No background processing.
