import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentListItem, ParsedDocument } from "./documentTypes";

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
  return /^doc_[A-Za-z0-9_-]+$/.test(id);
}

function assertInsideDataRoot(candidatePath: string) {
  const resolvedDataRoot = path.resolve(dataRoot);
  const resolvedCandidate = path.resolve(candidatePath);
  if (resolvedCandidate !== resolvedDataRoot && !resolvedCandidate.startsWith(`${resolvedDataRoot}${path.sep}`)) {
    throw new Error("Refusing to access a path outside data directory.");
  }
  return resolvedCandidate;
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

export function toProjectRelativePath(filePath: string) {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
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

export async function listParsedDocuments() {
  await ensureDocumentDirectories();

  let entries: string[];
  try {
    entries = await readdir(documentsDir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw error;
  }

  const documents: DocumentListItem[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const filePath = assertInsideDataRoot(path.join(documentsDir, entry));
      const raw = await readFile(filePath, "utf8");
      const document = JSON.parse(raw) as ParsedDocument;
      documents.push({
        id: document.id,
        title: document.title,
        filename: document.filename,
        fileType: document.fileType,
        createdAt: document.createdAt,
        status: document.status,
        pageCount: document.pageCount,
        textLength: document.text.length,
        documentType: document.analysis.documentType,
        language: document.analysis.language
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`Skipping invalid document JSON ${entry}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  return documents.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function deleteParsedDocument(id: string) {
  await ensureDocumentDirectories();
  const document = await readParsedDocument(id);
  const jsonPath = assertInsideDataRoot(getDocumentJsonPath(id));

  if (document.uploadPath) {
    const uploadPath = assertInsideDataRoot(path.join(process.cwd(), document.uploadPath));
    await rm(uploadPath, { force: true });
  } else {
    const possibleUploads = await readdir(uploadsDir).catch(() => []);
    await Promise.all(
      possibleUploads
        .filter((entry) => entry.startsWith(`${id}-`))
        .map((entry) => rm(assertInsideDataRoot(path.join(uploadsDir, entry)), { force: true }))
    );
  }

  await rm(jsonPath, { force: false });
}
