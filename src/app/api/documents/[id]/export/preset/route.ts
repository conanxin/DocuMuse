import { NextResponse } from "next/server";
import { isValidDocumentId, readParsedDocument } from "@/lib/documentStorage";
import { buildSafeExportFilename } from "@/lib/exporters/jsonExporter";
import { getExportPresetById } from "@/lib/exporters/exportPresets";
import { buildPresetZipExport } from "@/lib/exporters/zipExporter";
import type { ExportPresetId } from "@/lib/exporters/exportTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "Document id is invalid." }, { status: 400 });
  }

  const url = new URL(request.url);
  const presetId = url.searchParams.get("preset");
  if (!presetId || !getExportPresetById(presetId)) {
    return NextResponse.json({ ok: false, error: "Export preset is invalid." }, { status: 400 });
  }

  try {
    const document = await readParsedDocument(id);
    const buffer = await buildPresetZipExport(document, presetId as ExportPresetId);
    const filename = buildSafeExportFilename(document, "zip", `documuse-${presetId}`);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition(filename)
      }
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "Document does not exist." }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Preset ZIP export failed.",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}

function contentDisposition(filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]+/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
