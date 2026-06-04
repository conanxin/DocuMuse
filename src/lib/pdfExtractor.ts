import { buildDocumentStructure } from "./documentStructure";
import type { ParsedPage, ParsedParagraph, ParsedSection, ParseDiagnostics } from "./documentTypes";

export type ExtractedPdfText = {
  text: string;
  pageCount: number;
  metadata?: unknown;
};

export type ExtractedPdfDocument = ExtractedPdfText & {
  pages: ParsedPage[];
  paragraphs: ParsedParagraph[];
  sections: ParsedSection[];
  parseDiagnostics: ParseDiagnostics;
};

function cleanExtractedText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line))
    .join("\n")
    .trim();
}

export async function extractPdfText(buffer: Buffer): Promise<ExtractedPdfText> {
  const document = await extractPdfDocument(buffer);
  return {
    text: document.text,
    pageCount: document.pageCount,
    metadata: document.metadata
  };
}

export async function extractPdfDocument(buffer: Buffer): Promise<ExtractedPdfDocument> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = cleanExtractedText(result.text);
    const pageCount = result.total ?? result.pages?.length ?? 0;
    const structure = buildDocumentStructure(text, pageCount, "pdf-parse");
    const resultMetadata = result as { info?: unknown; metadata?: unknown };
    return {
      text: structure.text,
      pageCount: structure.pageCount,
      pages: structure.pages,
      paragraphs: structure.paragraphs,
      sections: structure.sections,
      parseDiagnostics: structure.parseDiagnostics,
      metadata: resultMetadata.info ?? resultMetadata.metadata
    };
  } finally {
    await parser.destroy();
  }
}
