import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedDocument } from "./documentTypes";

const dataRoot = path.join(process.cwd(), "data");
const uploadsDir = path.join(dataRoot, "uploads");
const documentsDir = path.join(dataRoot, "documents");

export async function ensureDocumentDirectories() {
  await Promise.all([
    mkdir(uploadsDir, { recursive: true }),
    mkdir(documentsDir, { recursive: true })
  ]);
}

export function sanitizePdfFilename(filename: string) {
  const basename = path.basename(filename || "uploaded.pdf");
  const safe = basename
    .replace(/[^\w.\-\u4e00-\u9fff ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  const withExtension = safe.toLowerCase().endsWith(".pdf") ? safe : `${safe || "uploaded"}.pdf`;
  return withExtension.slice(0, 120);
}

export function isValidDocumentId(id: string) {
  return /^doc_[a-f0-9-]{36}$/.test(id);
}

export function getUploadPath(id: string, filename: string) {
  if (!isValidDocumentId(id)) {
    throw new Error("Invalid document id.");
  }
  return path.join(uploadsDir, `${id}-${sanitizePdfFilename(filename)}`);
}

export function getDocumentJsonPath(id: string) {
  if (!isValidDocumentId(id)) {
    throw new Error("Invalid document id.");
  }
  return path.join(documentsDir, `${id}.json`);
}

export async function saveParsedDocument(document: ParsedDocument) {
  await ensureDocumentDirectories();
  await writeFile(getDocumentJsonPath(document.id), JSON.stringify(document, null, 2), "utf8");
}

export async function readParsedDocument(id: string) {
  await ensureDocumentDirectories();
  const raw = await readFile(getDocumentJsonPath(id), "utf8");
  return JSON.parse(raw) as ParsedDocument;
}

export async function saveUploadedPdf(id: string, filename: string, buffer: Buffer) {
  await ensureDocumentDirectories();
  const uploadPath = getUploadPath(id, filename);
  await writeFile(uploadPath, buffer);
  return uploadPath;
}
