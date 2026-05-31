import { NextResponse } from "next/server";
import { testLlmConnection, toPublicLlmError } from "@/lib/llmClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await testLlmConnection();
    return NextResponse.json({
      ok: true,
      model: result.model,
      message: result.data.message || "连接成功"
    });
  } catch (error) {
    const publicError = toPublicLlmError(error);
    return NextResponse.json({ ok: false, error: publicError.message }, { status: publicError.status });
  }
}
