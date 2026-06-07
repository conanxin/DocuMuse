import { NextResponse } from "next/server";
import { createDocumentKindOverride, ensureDocumentKind, getEffectiveDocumentKind } from "@/lib/documentKindDetector";
import { isValidDocumentId, readParsedDocument, saveParsedDocument } from "@/lib/documentStorage";
import type { DocumentKind, ParsedDocument } from "@/lib/documentTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_KINDS: DocumentKind[] = ["paper", "interview", "business-report", "fiction", "manual", "book-chapter", "article", "unknown"];

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const document = await readDocumentForKind(params.id);
  if ("response" in document) return document.response;

  return NextResponse.json(buildKindResponse(document.document));
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const documentResult = await readDocumentForKind(params.id);
  if ("response" in documentResult) return documentResult.response;

  try {
    const body = await request.json().catch(() => ({}));
    const kind = body.kind as DocumentKind | undefined;
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : undefined;

    if (!kind || !VALID_KINDS.includes(kind)) {
      return NextResponse.json({ ok: false, error: "文档类型无效。" }, { status: 400 });
    }

    const updated: ParsedDocument = {
      ...documentResult.document,
      documentKindOverride: createDocumentKindOverride(kind, reason)
    };
    await saveParsedDocument(updated);

    return NextResponse.json(buildKindResponse(updated));
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "保存文档类型设置失败。",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const documentResult = await readDocumentForKind(params.id);
  if ("response" in documentResult) return documentResult.response;

  try {
    const { documentKindOverride: _removed, ...rest } = documentResult.document;
    const updated = rest as ParsedDocument;
    await saveParsedDocument(updated);
    return NextResponse.json(buildKindResponse(updated));
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "重置文档类型失败。",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}

async function readDocumentForKind(id: string): Promise<{ document: ParsedDocument } | { response: NextResponse }> {
  if (!isValidDocumentId(id)) {
    return { response: NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 }) };
  }

  try {
    return { document: ensureDocumentKind(await readParsedDocument(id)) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { response: NextResponse.json({ ok: false, error: "文档不存在。" }, { status: 404 }) };
    }
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "读取文档类型失败。",
          detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
        },
        { status: 500 }
      )
    };
  }
}

function buildKindResponse(document: ParsedDocument) {
  const effective = getEffectiveDocumentKind(document);
  return {
    ok: true,
    auto: document.documentKind ?? effective.auto,
    override: document.documentKindOverride,
    effective
  };
}
