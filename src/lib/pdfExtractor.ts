export type ExtractedPdfText = {
  text: string;
  pageCount: number;
  metadata?: unknown;
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
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return {
      text: cleanExtractedText(result.text),
      pageCount: result.total ?? result.pages?.length ?? 0
    };
  } finally {
    await parser.destroy();
  }
}
