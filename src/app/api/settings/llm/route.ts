import { NextResponse } from "next/server";
import { getPublicLlmConfig, saveLlmConfig } from "@/lib/llmSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getPublicLlmConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "读取 LLM 设置失败。",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      provider?: string;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      temperature?: number;
    };

    await saveLlmConfig({
      provider: body.provider as never,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      model: body.model,
      temperature: body.temperature
    });
    const config = await getPublicLlmConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "保存 LLM 设置失败。",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}
