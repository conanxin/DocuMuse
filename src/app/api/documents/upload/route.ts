import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { generateSimpleAnalysis } from "@/lib/simpleAnalysis";
import { sanitizePdfFilename, saveParsedDocument, saveUploadedPdf, toProjectRelativePath } from "@/lib/documentStorage";
import { extractPdfText } from "@/lib/pdfExtractor";
import type { ParsedDocument } from "@/lib/documentTypes";

export const runtime = "nodejs";

function getShortDetail(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 300);
  }
  return String(error).slice(0, 300);
}

function errorResponse(message: string, status = 400, detail?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      detail: process.env.NODE_ENV === "development" && detail ? getShortDetail(detail) : undefined
    },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("未选择文件。");
    }

    const originalName = file.name || "";
    const isPdf = file.type === "application/pdf" || originalName.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return errorResponse("仅支持上传 PDF 文件。");
    }
    const safeFilename = sanitizePdfFilename(originalName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) {
      return errorResponse("上传的 PDF 文件为空。");
    }

    const id = `doc_${randomUUID()}`;
    const uploadPath = await saveUploadedPdf(id, safeFilename, buffer);

    let parsed;
    try {
      parsed = await extractPdfText(buffer);
    } catch (error) {
      return errorResponse("PDF 解析失败，请确认文件未加密且格式有效。", 422, error);
    }

    if (!parsed.text) {
      return errorResponse("当前版本暂不支持 OCR，请上传包含可复制文本的 PDF。", 422);
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
      uploadPath: toProjectRelativePath(uploadPath),
      metadata: parsed.metadata ? { pdfParse: parsed.metadata } : {},
      analysis: generateSimpleAnalysis(parsed.text)
    };

    await saveParsedDocument(document);

    return NextResponse.json({
      ok: true,
      documentId: id,
      redirectUrl: `/documents/${id}`
    });
  } catch (error) {
    return errorResponse("上传或本地写入失败，请稍后重试。", 500, error);
  }
}
