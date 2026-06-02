import { NextResponse } from "next/server";
import { isValidDocumentId, readParsedDocument } from "@/lib/documentStorage";
import { buildAllPresetExportPlans } from "@/lib/exporters/exportPresets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "Document id is invalid." }, { status: 400 });
  }

  try {
    const document = await readParsedDocument(id);
    return NextResponse.json({
      ok: true,
      presets: buildAllPresetExportPlans(document)
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "Document does not exist." }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to build export presets.",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}
