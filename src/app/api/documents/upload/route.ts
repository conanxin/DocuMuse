import { randomUUID } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { generateSimpleAnalysis } from "@/lib/simpleAnalysis";
import { sanitizePdfFilename, saveParsedDocument, saveUploadedPdf } from "@/lib/documentStorage";
import type { ParsedDocument } from "@/lib/documentTypes";

export const runtime = "nodejs";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      text: result.text.trim(),
      pageCount: result.total ?? result.pages?.length ?? 0
    };
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("未选择文件。");
    }

    const safeFilename = sanitizePdfFilename(file.name);
    const isPdf = file.type === "application/pdf" || safeFilename.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return errorResponse("仅支持上传 PDF 文件。");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) {
      return errorResponse("上传的 PDF 文件为空。");
    }

    const id = `doc_${randomUUID()}`;
    await saveUploadedPdf(id, safeFilename, buffer);

    let parsed;
    try {
      parsed = await extractPdfText(buffer);
    } catch {
      return errorResponse("PDF 解析失败，请确认文件未加密且格式有效。", 422);
    }

    if (!parsed.text) {
      return errorResponse("PDF 文本为空，暂时无法生成工作台。", 422);
    }

    const document: ParsedDocument = {
      id,
      title: safeFilename,
      filename: safeFilename,
      fileType: "pdf",
      createdAt: new Date().toISOString(),
      status: "parsed",
      text: parsed.text,
      pageCount: parsed.pageCount,
      metadata: {},
      analysis: generateSimpleAnalysis(parsed.text)
    };

    await saveParsedDocument(document);

    return NextResponse.json({
      ok: true,
      documentId: id,
      redirectUrl: `/documents/${id}`
    });
  } catch {
    return errorResponse("上传或本地写入失败，请稍后重试。", 500);
  }
}
