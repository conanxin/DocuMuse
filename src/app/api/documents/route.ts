import { NextResponse } from "next/server";
import { listParsedDocuments } from "@/lib/documentStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const documents = await listParsedDocuments();
    return NextResponse.json({ ok: true, documents });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "读取本地文档列表失败。",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}
