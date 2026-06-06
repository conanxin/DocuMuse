import { NextResponse } from "next/server";
import { isValidDocumentId, readParsedDocument, saveParsedDocument } from "@/lib/documentStorage";
import { getEffectiveOutline, getOutlineMode, resetOutlineEdits } from "@/lib/outlineUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    const document = await readParsedDocument(id);
    const updatedDocument = resetOutlineEdits(document);
    await saveParsedDocument(updatedDocument);
    return NextResponse.json({
      ok: true,
      mode: getOutlineMode(updatedDocument),
      autoOutline: updatedDocument.outline ?? [],
      customOutline: [],
      effectiveOutline: getEffectiveOutline(updatedDocument)
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "文档不存在。" }, { status: 404 });
    }
    return NextResponse.json(
      {
        ok: false,
        error: "重置大纲失败。",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}
