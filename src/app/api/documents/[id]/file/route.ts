import { NextResponse } from "next/server";
import { isValidDocumentId, readParsedDocument, readUploadedPdfForDocument } from "@/lib/documentStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (id === "demo") {
    return NextResponse.json({ ok: false, error: "Demo 文档没有真实 PDF 文件。" }, { status: 404 });
  }

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    const document = await readParsedDocument(id);
    const { buffer, filename } = await readUploadedPdfForDocument(document);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "文档或上传 PDF 不存在。" }, { status: 404 });
    }
    return NextResponse.json(
      {
        ok: false,
        error: id === "demo" ? "Demo 文档没有真实 PDF 文件。" : "读取 PDF 文件失败。",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}
