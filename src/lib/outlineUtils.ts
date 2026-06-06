import type { DocumentOutlineNode, EditableOutlineNode, ParsedDocument, ParsedSection } from "./documentTypes";

export function getEffectiveOutline(document: ParsedDocument): DocumentOutlineNode[] {
  if (document.outlineEditState?.mode === "custom") {
    if (document.outlineEditState.customOutline?.length) {
      return filterHiddenOutline(document.outlineEditState.customOutline);
    }
    return [];
  }

  if (document.outline?.length) return document.outline;
  return outlineFromSections(document.sections ?? []);
}

export function createEditableOutlineFromAuto(outline: DocumentOutlineNode[] = []): EditableOutlineNode[] {
  return outline.map((node) => ({
    ...node,
    originalTitle: node.title,
    children: node.children?.length ? createEditableOutlineFromAuto(node.children) : undefined
  }));
}

export function resetOutlineEdits(document: ParsedDocument): ParsedDocument {
  const { outlineEditState: _outlineEditState, ...rest } = document;
  return rest;
}

export function getOutlineMode(document: ParsedDocument): "auto" | "custom" {
  return document.outlineEditState?.mode === "custom" ? "custom" : "auto";
}

function filterHiddenOutline(nodes: EditableOutlineNode[]): DocumentOutlineNode[] {
  return nodes
    .filter((node) => !node.hidden)
    .map((node) => {
      const { hidden: _hidden, userEdited: _userEdited, manual: _manual, originalTitle: _originalTitle, updatedAt: _updatedAt, children, ...rest } = node;
      return {
        ...rest,
        children: children?.length ? filterHiddenOutline(children as EditableOutlineNode[]) : undefined
      };
    });
}

function outlineFromSections(sections: ParsedSection[]): DocumentOutlineNode[] {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    level: section.level,
    index: section.index,
    pageNumber: section.pageNumber,
    startParagraphId: section.startParagraphId,
    endParagraphId: section.endParagraphId,
    startChar: section.startChar,
    endChar: section.endChar,
    confidence: "low",
    type: section.level > 1 ? "subsection" : "section"
  }));
}
