import { NextResponse } from "next/server";
import { isValidDocumentId, readParsedDocument } from "@/lib/documentStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    const document = await readParsedDocument(id);
    return NextResponse.json({
      ok: true,
      analysisMode: document.analysisMode,
      analysisStatus: document.analysisStatus,
      analysisProgress: document.analysisProgress,
      analyzedAt: document.analyzedAt,
      analysisError: document.analysisError,
      analysisModel: document.analysisModel,
      analysisProvider: document.analysisProvider,
      analysisInputChars: document.analysisInputChars,
      analysisTruncated: document.analysisTruncated,
      chunks: document.chunks,
      chunkAnalyses: document.chunkAnalyses,
      analysisDiagnostics: document.analysisDiagnostics
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "文档不存在。" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "读取分析状态失败。" }, { status: 500 });
  }
}
