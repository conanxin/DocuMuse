import { NextResponse } from "next/server";
import { isValidDocumentId, readParsedDocument } from "@/lib/documentStorage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    const document = await readParsedDocument(id);
    return NextResponse.json(document);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "文档不存在。" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "读取文档失败。" }, { status: 500 });
  }
}
