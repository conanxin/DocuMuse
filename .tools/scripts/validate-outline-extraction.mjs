import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import ts from "typescript";
import Module from "node:module";

const rootDir = process.cwd();
const fixtureDir = path.join(rootDir, ".tools", "test-fixtures", "outline");
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const standardFontDataUrl = pathToFileURL(path.join(rootDir, "node_modules", "pdfjs-dist", "standard_fonts") + path.sep).href;

registerTypeScript();

const require = createRequire(import.meta.url);
const { extractDocumentOutline, flattenOutline } = require(path.join(rootDir, "src", "lib", "outlineExtractor.ts"));
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
pdfjs.setVerbosityLevel?.(pdfjs.VerbosityLevel?.ERRORS ?? 0);

const fixtures = [
  {
    file: "zh-paper-outline.pdf",
    status: "active",
    label: "Chinese paper near-real fixture",
    expectedMinNodes: 6,
    expectedTypes: ["abstract", "introduction", "conclusion", "references"],
    html: `
      <h1>中文论文型大纲测试</h1>
      <h2>摘要</h2><p>本文研究本地 AI 文档阅读工作台的结构化解析流程，重点关注章节识别与来源追踪。</p>
      <h2>关键词</h2><p>文档解析；章节识别；来源定位；导出</p>
      <h2>引言</h2><p>现有文档阅读工具通常难以同时兼顾原文定位、摘要分析和结构化导出。</p>
      <h2>1. 方法</h2><p>本文采用启发式规则识别可复制文本 PDF 中的标题。</p>
      <h3>1.1 数据来源</h3><p>测试样本来自本地生成的小型 PDF，不调用外部服务。</p>
      <h2>2. 结果</h2><p>系统能够生成 outline 与 outlineDiagnostics。</p>
      <h2>结论</h2><p>章节识别适合作为本地大纲导航的基础能力。</p>
      <h2>参考文献</h2><p>[1] DocuMuse outline validation notes.</p>`
  },
  {
    file: "zh-report-outline.pdf",
    status: "active",
    label: "Chinese report near-real fixture",
    expectedMinNodes: 6,
    expectedTypes: ["conclusion", "appendix"],
    html: `
      <h1>中文报告型大纲测试</h1>
      <h2>一、项目背景</h2><p>本报告用于验证中文编号标题的识别。</p>
      <h3>（一）建设目标</h3><p>目标是建立稳定的本地文档阅读工作台。</p>
      <h3>（二）范围说明</h3><p>本阶段不包含 OCR、向量数据库或外部模板系统。</p>
      <h2>二、实施方案</h2><p>方案包括上传、解析、大纲生成、导出和验证。</p>
      <h2>三、风险与对策</h2><p>标题误检和漏检需要通过 fixture 持续回归。</p>
      <h2>结论</h2><p>当前规则可覆盖常见中文报告标题。</p>
      <h2>附录</h2><p>附录列出后续待覆盖的复杂排版。</p>`
  },
  {
    file: "en-paper-outline.pdf",
    status: "active",
    label: "English paper near-real fixture",
    expectedMinNodes: 6,
    expectedTypes: ["abstract", "introduction", "conclusion", "references"],
    html: `
      <h1>English Paper Outline Fixture</h1>
      <h2>Abstract</h2><p>This paper evaluates deterministic outline extraction for local PDF reading.</p>
      <h2>Introduction</h2><p>The introduction describes why document structure matters for analysis and source navigation.</p>
      <h2>1 Method</h2><p>The method uses lightweight heading rules without machine learning.</p>
      <h3>1.1 Dataset</h3><p>The dataset contains small local PDF fixtures generated for regression checks.</p>
      <h2>2 Results</h2><p>The results show outline nodes, nested levels, and diagnostics.</p>
      <h2>Conclusion</h2><p>The conclusion states that heuristic outlines are useful but approximate.</p>
      <h2>References</h2><p>[1] Local validation fixture.</p>`
  },
  {
    file: "en-report-outline.pdf",
    status: "active",
    label: "English report near-real fixture",
    expectedMinNodes: 6,
    expectedTypes: ["introduction", "appendix"],
    html: `
      <h1>English Report Outline Fixture</h1>
      <h2>1. Introduction</h2><p>This section introduces the report context.</p>
      <h3>1.1 Background</h3><p>The background explains the document workflow.</p>
      <h2>2. Analysis</h2><p>The analysis section summarizes observed behavior.</p>
      <h2>3. Recommendations</h2><p>Recommendations focus on validation and conservative rule tuning.</p>
      <h2>Appendix</h2><p>The appendix lists pending future cases such as rotation and CropBox differences.</p>`
  }
];

fs.mkdirSync(fixtureDir, { recursive: true });
writeReadme();

let failures = 0;
const results = [];

for (const fixture of fixtures) {
  const htmlPath = path.join(fixtureDir, fixture.file.replace(/\.pdf$/, ".html"));
  const pdfPath = path.join(fixtureDir, fixture.file);
  fs.writeFileSync(htmlPath, fixtureHtml(fixture.label, fixture.html), "utf8");
  ensurePdf(htmlPath, pdfPath);

  try {
    const parsed = await parseFixturePdf(pdfPath);
    const result = extractDocumentOutline(parsed.paragraphs, parsed.pages, parsed.diagnostics);
    const flat = flattenOutline(result.outline);
    const types = new Set(flat.map((node) => node.type));
    const missingTypes = fixture.expectedTypes.filter((type) => !types.has(type));
    const falsePositives = flat.filter((node) => /\b(the|this|that)\b.+\b(conclusion|introduction)\b/i.test(node.title));
    const passed = flat.length >= fixture.expectedMinNodes && missingTypes.length === 0 && falsePositives.length === 0;
    if (!passed) failures += 1;
    results.push({
      fixture: fixture.file,
      status: passed ? "passed" : "failed",
      outlineNodeCount: flat.length,
      maxDepth: result.outlineDiagnostics.maxDepth,
      detectedAbstract: result.outlineDiagnostics.detectedAbstract,
      detectedIntroduction: result.outlineDiagnostics.detectedIntroduction,
      detectedConclusion: result.outlineDiagnostics.detectedConclusion,
      detectedReferences: result.outlineDiagnostics.detectedReferences,
      topLevelNodes: result.outline.map((node) => node.title),
      missingTypes,
      falsePositives: falsePositives.map((node) => node.title),
      warnings: result.outlineDiagnostics.warnings
    });
  } catch (error) {
    failures += 1;
    results.push({
      fixture: fixture.file,
      status: "failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

for (const result of results) {
  console.log(formatResult(result));
}

const passed = results.filter((result) => result.status === "passed").length;
console.log(`\nSummary: ${passed} passed, ${failures} failed.`);
if (failures > 0) process.exitCode = 1;

function fixtureHtml(title, body) {
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 54pt 58pt; }
body { font-family: Arial, "Microsoft YaHei", sans-serif; color: #111827; line-height: 1.55; }
h1 { font-size: 22pt; margin: 0 0 24pt; color: #1d4ed8; }
h2 { font-size: 15pt; margin: 18pt 0 8pt; color: #111827; }
h3 { font-size: 12pt; margin: 12pt 0 6pt; color: #334155; }
p { font-size: 10.5pt; margin: 0 0 8pt; }
</style></head><body>${body}</body></html>`;
}

function ensurePdf(htmlPath, pdfPath) {
  if (!fs.existsSync(edgePath)) {
    throw new Error("Microsoft Edge was not found; outline PDF fixtures cannot be generated.");
  }
  execFileSync(edgePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=5000",
    `--print-to-pdf=${pdfPath}`,
    `file:///${htmlPath.replace(/\\/g, "/")}`
  ], { stdio: "ignore" });
  if (!fs.existsSync(pdfPath)) throw new Error(`Failed to generate fixture PDF: ${pdfPath}`);
}

async function parseFixturePdf(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjs.getDocument({
    data,
    disableFontFace: true,
    isEvalSupported: false,
    standardFontDataUrl,
    useWorkerFetch: false
  }).promise;

  const pages = [];
  const paragraphs = [];
  let cursor = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent({ includeMarkedContent: false });
    const rawLines = textContent.items
      .map((item) => (typeof item.str === "string" ? item.str.trim() : ""))
      .filter((text) => text.length > 1);
    const lines = mergeSplitHeadingLines(rawLines);
    const pageStart = cursor;
    for (const line of lines) {
      const startChar = cursor;
      const endChar = startChar + line.length;
      paragraphs.push({
        id: `para-${paragraphs.length + 1}`,
        index: paragraphs.length + 1,
        pageNumber,
        text: line,
        startChar,
        endChar,
        sourceHint: `第 ${pageNumber} 页 · 第 ${paragraphs.length + 1} 段`
      });
      cursor = endChar + 2;
    }
    pages.push({
      pageNumber,
      text: lines.join("\n"),
      startChar: pageStart,
      endChar: cursor
    });
  }

  await pdf.destroy();
  return {
    pages,
    paragraphs,
    diagnostics: {
      parser: "outline-fixture-pdfjs",
      parsedAt: new Date().toISOString(),
      pageCount: pages.length,
      textLength: cursor,
      paragraphCount: paragraphs.length,
      sectionCount: 0,
      averageCharsPerPage: pages.length ? Math.round(cursor / pages.length) : 0,
      emptyPageCount: 0,
      suspectedScannedPdf: false,
      hasVeryShortText: false,
      warnings: []
    }
  };
}

function mergeSplitHeadingLines(lines) {
  const merged = [];
  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];
    if (/^\d+(?:\.\d+)*\.?$/.test(current) && next && next.length <= 60) {
      merged.push(`${current.replace(/\.$/, "")} ${next}`);
      index += 1;
      continue;
    }
    merged.push(current);
  }
  return merged;
}

function writeReadme() {
  fs.writeFileSync(path.join(fixtureDir, "README.md"), `# Outline Fixtures

These are small near-real PDF fixtures for Phase 4E.2 outline validation.

They are generated locally from HTML by \`.tools/scripts/validate-outline-extraction.mjs\`.

Active fixture types:

- Chinese paper-style document.
- Chinese report-style document.
- English paper-style document.
- English report-style document.

They are not downloaded real-world documents and should be treated as near-real fixtures.
`, "utf8");
}

function formatResult(result) {
  if (result.status === "passed") {
    return `[passed] ${result.fixture} nodes=${result.outlineNodeCount} depth=${result.maxDepth} top=${result.topLevelNodes.join(" | ")}`;
  }
  return `[failed] ${result.fixture} ${result.message ?? ""} missing=${result.missingTypes?.join(",") ?? ""} falsePositive=${result.falsePositives?.join(",") ?? ""}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function registerTypeScript() {
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function resolveWithTs(request, parent, isMain, options) {
    try {
      return originalResolve.call(this, request, parent, isMain, options);
    } catch (error) {
      if (request.startsWith(".") && parent?.filename) {
        const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
        if (fs.existsSync(candidate)) return candidate;
      }
      throw error;
    }
  };

  Module._extensions[".ts"] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true
      }
    });
    module._compile(output.outputText, filename);
  };
}
