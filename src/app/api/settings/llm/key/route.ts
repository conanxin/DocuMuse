import { NextResponse } from "next/server";
import { clearStoredApiKey, getPublicLlmConfig } from "@/lib/llmSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    await clearStoredApiKey();
    const config = await getPublicLlmConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "清除 API Key 失败。",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}
