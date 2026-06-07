import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");
const documentsDir = path.join(root, "data", "documents");
const expectedPath = path.join(root, ".tools", "test-fixtures", "document-kind", "expected-real-samples.json");

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveTypeScript(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const target = path.join(root, "src", request.slice(2));
    for (const ext of [".ts", ".tsx", ".js"]) {
      if (fs.existsSync(`${target}${ext}`)) return `${target}${ext}`;
    }
  }
  if (request.startsWith("./") || request.startsWith("../")) {
    const base = path.resolve(path.dirname(parent.filename), request);
    for (const ext of [".ts", ".tsx", ".js", ".json"]) {
      if (fs.existsSync(`${base}${ext}`)) return `${base}${ext}`;
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

Module._extensions[".ts"] = Module._extensions[".tsx"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  module._compile(output, filename);
};

const require = createRequire(import.meta.url);
const { detectDocumentKind } = require(path.join(root, "src", "lib", "documentKindDetector.ts"));

const expectedKinds = loadExpectedKinds();

if (!fs.existsSync(documentsDir)) {
  console.log("No data/documents directory found. Upload PDFs before running real-sample validation.");
  process.exit(0);
}

const files = fs
  .readdirSync(documentsDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

if (files.length === 0) {
  console.log("No parsed document JSON files found in data/documents.");
  process.exit(0);
}

let checked = 0;
let matched = 0;
let expectedCount = 0;

for (const file of files) {
  const fullPath = path.join(documentsDir, file);
  let document;
  try {
    document = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    console.warn(`[skipped] ${file}: failed to parse JSON (${error.message})`);
    continue;
  }

  const inferred = detectDocumentKind({
    text: document.text,
    paragraphs: document.paragraphs,
    outline: document.outline,
    parseDiagnostics: document.parseDiagnostics,
    outlineDiagnostics: document.outlineDiagnostics
  });
  const expected = expectedKinds[document.id] ?? expectedKinds[document.filename] ?? expectedKinds[document.title];
  const isMatch = expected ? expected === inferred.kind : undefined;

  checked += 1;
  if (expected) expectedCount += 1;
  if (isMatch) matched += 1;

  console.log(`[sample] ${document.id || path.basename(file, ".json")}`);
  console.log(`  title: ${document.title || document.filename || "(untitled)"}`);
  console.log(`  filename: ${document.filename || "(unknown)"}`);
  console.log(`  storedKind: ${document.documentKind?.kind || "(none)"}`);
  console.log(`  inferredKind: ${inferred.kind}`);
  console.log(`  confidence: ${inferred.confidence}`);
  console.log(`  expectedKind: ${expected || "(not annotated)"}`);
  console.log(`  expectedMatch: ${isMatch === undefined ? "(not checked)" : isMatch ? "yes" : "no"}`);
  console.log(`  textLength: ${typeof document.text === "string" ? document.text.length : 0}`);
  console.log(`  outlineNodeCount: ${Array.isArray(document.outline) ? document.outline.length : 0}`);
  console.log(`  reasons: ${inferred.reasons.join(" | ") || "(none)"}`);
}

console.log(`\nSummary: ${checked} samples checked, ${expectedCount} annotated, ${matched} expected matches.`);

function loadExpectedKinds() {
  if (!fs.existsSync(expectedPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(expectedPath, "utf8"));
  } catch (error) {
    console.warn(`Failed to read expected real-sample labels: ${error.message}`);
    return {};
  }
}
