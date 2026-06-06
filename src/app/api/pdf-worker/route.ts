import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workerPath = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
    const source = await readFile(workerPath, "utf8");
    return new NextResponse(source, {
      status: 200,
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "PDF worker is unavailable." }, { status: 404 });
  }
}
