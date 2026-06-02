import { NextResponse } from "next/server";
import { buildDocumentJsonExport, buildSafeExportFilename, normalizeExportOptions } from "@/lib/exporters/jsonExporter";
import { buildDocumentMarkdownExport } from "@/lib/exporters/markdownExporter";
import { buildDocumentPptxExport } from "@/lib/exporters/pptxExporter";
import { isValidDocumentId, readParsedDocument } from "@/lib/documentStorage";
import type { DocumentExportOptions, ExportFormat } from "@/lib/exporters/exportTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "Document id is invalid." }, { status: 400 });
  }

  const url = new URL(request.url);
  const format = parseFormat(url.searchParams.get("format"));
  if (!format) {
    return NextResponse.json({ ok: false, error: "Unsupported export format. Use markdown, json, or pptx." }, { status: 400 });
  }

  const options = parseOptions(url.searchParams);

  try {
    const document = await readParsedDocument(id);
    const prefix = options.only === "chat" ? "documuse-chat" : "documuse";
    const extension = format === "markdown" ? "md" : format;
    const filename = buildSafeExportFilename(document, extension, prefix);

    if (format === "json") {
      const payload = buildDocumentJsonExport(document, options);
      return new Response(JSON.stringify(payload, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": contentDisposition(filename)
        }
      });
    }

    if (format === "pptx") {
      const buffer = await buildDocumentPptxExport(document);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": contentDisposition(filename)
        }
      });
    }

    const markdown = buildDocumentMarkdownExport(document, options);
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
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
        error: "Export failed.",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}

function parseFormat(value: string | null): ExportFormat | null {
  if (!value || value === "markdown" || value === "md") return "markdown";
  if (value === "json") return "json";
  if (value === "pptx") return "pptx";
  return null;
}

function parseOptions(searchParams: URLSearchParams): DocumentExportOptions {
  return normalizeExportOptions({
    includeChat: parseBoolean(searchParams.get("includeChat"), true),
    includeCreative: parseBoolean(searchParams.get("includeCreative"), true),
    includeChunks: parseBoolean(searchParams.get("includeChunks"), false),
    only: searchParams.get("only") === "chat" ? "chat" : undefined
  });
}

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  return value === "true" || value === "1" || value === "yes";
}

function contentDisposition(filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]+/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
