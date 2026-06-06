import { NextResponse } from "next/server";
import { isValidDocumentId, readParsedDocument, saveParsedDocument } from "@/lib/documentStorage";
import type { EditableOutlineNode, OutlineEditState } from "@/lib/documentTypes";
import { createEditableOutlineFromAuto, getEffectiveOutline, getOutlineMode } from "@/lib/outlineUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const documentOrResponse = await readOutlineDocument(params.id);
  if (documentOrResponse instanceof NextResponse) return documentOrResponse;

  const document = documentOrResponse;
  return NextResponse.json({
    ok: true,
    mode: getOutlineMode(document),
    autoOutline: document.outline ?? [],
    customOutline: document.outlineEditState?.customOutline ?? [],
    effectiveOutline: getEffectiveOutline(document)
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const documentOrResponse = await readOutlineDocument(params.id);
  if (documentOrResponse instanceof NextResponse) return documentOrResponse;

  try {
    const body = (await request.json()) as Partial<OutlineEditState>;
    const mode: OutlineEditState["mode"] = body.mode === "custom" ? "custom" : "auto";
    const customOutline = Array.isArray(body.customOutline) ? normalizeCustomOutline(body.customOutline) : createEditableOutlineFromAuto(documentOrResponse.outline ?? []);

    const updatedDocument = {
      ...documentOrResponse,
      outlineEditState:
        mode === "custom"
          ? {
              mode,
              customOutline,
              updatedAt: new Date().toISOString(),
              note: typeof body.note === "string" ? body.note.slice(0, 300) : undefined
            }
          : { mode: "auto" as const, updatedAt: new Date().toISOString() }
    };

    await saveParsedDocument(updatedDocument);
    return NextResponse.json({
      ok: true,
      mode: getOutlineMode(updatedDocument),
      autoOutline: updatedDocument.outline ?? [],
      customOutline: updatedDocument.outlineEditState?.customOutline ?? [],
      effectiveOutline: getEffectiveOutline(updatedDocument)
    });
  } catch (error) {
    if (error instanceof OutlineValidationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      {
        ok: false,
        error: "保存自定义大纲失败。",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message.slice(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}

async function readOutlineDocument(id: string) {
  if (!isValidDocumentId(id)) {
    return NextResponse.json({ ok: false, error: "文档 id 无效。" }, { status: 400 });
  }

  try {
    return await readParsedDocument(id);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "文档不存在。" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "读取文档大纲失败。" }, { status: 500 });
  }
}

function normalizeCustomOutline(nodes: unknown[], depth = 0): EditableOutlineNode[] {
  if (nodes.length > 200) throw new OutlineValidationError("自定义大纲节点过多。");

  return nodes.map((node, index) => {
    if (!node || typeof node !== "object") throw new OutlineValidationError("自定义大纲格式无效。");
    const raw = node as Partial<EditableOutlineNode>;
    const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 180) : "";
    if (!title) throw new OutlineValidationError("自定义大纲标题不能为空。");

    const level = clampLevel(raw.level);
    const normalized: EditableOutlineNode = {
      id: safeId(raw.id, index),
      title,
      level,
      index: Number.isFinite(raw.index) ? Number(raw.index) : index + 1,
      pageNumber: safeOptionalNumber(raw.pageNumber),
      startParagraphId: safeOptionalString(raw.startParagraphId, 80),
      endParagraphId: safeOptionalString(raw.endParagraphId, 80),
      startChar: safeOptionalNumber(raw.startChar),
      endChar: safeOptionalNumber(raw.endChar),
      parentId: safeOptionalString(raw.parentId, 80),
      confidence: raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low" ? raw.confidence : "low",
      type: safeOutlineType(raw.type),
      userEdited: Boolean(raw.userEdited),
      hidden: Boolean(raw.hidden),
      manual: Boolean(raw.manual),
      originalTitle: safeOptionalString(raw.originalTitle, 180),
      updatedAt: safeOptionalString(raw.updatedAt, 80)
    };

    if (Array.isArray(raw.children) && depth < 4) {
      normalized.children = normalizeCustomOutline(raw.children, depth + 1);
    }

    return normalized;
  });
}

function clampLevel(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(3, Math.max(1, Math.round(number)));
}

function safeId(value: unknown, index: number) {
  const id = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{1,120}$/.test(id) ? id : `custom-outline-${index + 1}`;
}

function safeOptionalString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : undefined;
}

function safeOptionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function safeOutlineType(value: unknown): EditableOutlineNode["type"] {
  const allowed = ["title", "abstract", "introduction", "section", "subsection", "conclusion", "references", "appendix", "unknown"];
  return typeof value === "string" && allowed.includes(value) ? (value as EditableOutlineNode["type"]) : "unknown";
}

class OutlineValidationError extends Error {}
