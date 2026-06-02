"use client";

import type { ReactNode } from "react";

type Block =
  | { type: "heading"; level: 3 | 4; text: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "paragraph"; lines: string[] };

export function ChatAnswerRenderer({ content, expanded = false }: { content: string; expanded?: boolean }) {
  const blocks = parseMarkdown(content);

  return (
    <div className={`space-y-3 text-sm leading-7 text-slate-800 ${expanded ? "text-[15px]" : ""}`}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = block.level === 3 ? "h3" : "h4";
          return (
            <Tag key={index} className="mt-1 text-sm font-bold text-slate-950">
              {renderInline(block.text)}
            </Tag>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote key={index} className="rounded-r-lg border-l-4 border-blue-300 bg-blue-50/70 px-3 py-2 text-slate-700">
              {block.lines.map((line, lineIndex) => (
                <p key={lineIndex}>{renderInline(line)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={index} className="ml-5 list-disc space-y-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={index} className="ml-5 list-decimal space-y-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderInline(block.lines.join("\n"))}
          </p>
        );
      })}
    </div>
  );
}

function parseMarkdown(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const current = lines[index].trimEnd();
    if (!current.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{3,4})\s+(.+)$/.exec(current);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length === 3 ? 3 : 4, text: heading[2].trim() });
      index += 1;
      continue;
    }

    if (current.trimStart().startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trimStart().startsWith(">")) {
        quoteLines.push(lines[index].trimStart().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    if (/^\s*[-*]\s+/.test(current)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(current)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const line = lines[index];
      if (/^(#{3,4})\s+/.test(line) || line.trimStart().startsWith(">") || /^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
        break;
      }
      paragraphLines.push(line.trimEnd());
      index += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraphLines });
  }

  return blocks.length ? blocks : [{ type: "paragraph", lines: [content] }];
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code key={`${match.index}-code`} className="rounded bg-slate-200 px-1.5 py-0.5 text-[12px] text-slate-800">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(
        <strong key={`${match.index}-strong`} className="font-semibold text-slate-950">
          {token.slice(2, -2)}
        </strong>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
