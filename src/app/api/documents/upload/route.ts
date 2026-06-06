import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { generateSimpleAnalysis } from "@/lib/simpleAnalysis";
import { sanitizePdfFilename, saveParsedDocument, saveUploadedPdf, toProjectRelativePath } from "@/lib/documentStorage";
import { mapParagraphsToPdfCoordinates } from "@/lib/documentStructure";
import { extractDocumentOutline } from "@/lib/outlineExtractor";
import { extractPdfTextCoordinates } from "@/lib/pdfCoordinateExtractor";
import { extractPdfDocument } from "@/lib/pdfExtractor";
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
      parsed = await extractPdfDocument(buffer);
    } catch (error) {
      return errorResponse("PDF 解析失败，请确认文件未加密且格式有效。", 422, error);
    }

    if (!parsed.text || parsed.parseDiagnostics.hasVeryShortText) {
      return errorResponse("当前版本暂不支持 OCR，请上传包含可复制文本的 PDF。", 422);
    }

    const coordinateResult = await extractPdfTextCoordinates(buffer);
    const paragraphPositions = coordinateResult.textItems.length ? mapParagraphsToPdfCoordinates(parsed.paragraphs, coordinateResult.textItems) : [];
    const positionedParagraphCount = paragraphPositions.filter((position) => position.boundingBox).length;
    const coordinateDiagnostics = {
      ...coordinateResult.diagnostics,
      positionedParagraphCount,
      unpositionedParagraphCount: Math.max(0, parsed.paragraphs.length - positionedParagraphCount),
      coordinateAvailable: coordinateResult.diagnostics.coordinateAvailable && positionedParagraphCount > 0
    };
    const outlineResult = extractDocumentOutline(parsed.paragraphs, parsed.pages, parsed.parseDiagnostics);

    const document: ParsedDocument = {
      id,
      title: safeFilename,
      filename: safeFilename,
      fileType: "pdf",
      createdAt: new Date().toISOString(),
      status: "parsed",
      analysisStatus: "idle",
      text: parsed.text,
      pageCount: parsed.pageCount,
      pages: parsed.pages,
      paragraphs: parsed.paragraphs,
      sections: parsed.sections,
      outline: outlineResult.outline,
      outlineDiagnostics: outlineResult.outlineDiagnostics,
      parseDiagnostics: parsed.parseDiagnostics,
      pdfTextItems: coordinateResult.textItems,
      paragraphPositions,
      coordinateDiagnostics,
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
