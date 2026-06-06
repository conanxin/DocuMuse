import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();
const fixtureDir = path.join(rootDir, ".tools", "test-fixtures", "pdf-coordinate");
const fixtureNames = ["simple-one-page.pdf", "simple-multipage.pdf", "dense-paragraphs.pdf"];
const standardFontDataUrl = pathToFileURL(path.join(rootDir, "node_modules", "pdfjs-dist", "standard_fonts") + path.sep).href;

const originalConsoleWarn = console.warn.bind(console);
console.warn = (...args) => {
  const message = args.join(" ");
  if (message.includes("Unable to load font data") || message.includes("standardFontDataUrl")) return;
  originalConsoleWarn(...args);
};

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
pdfjs.setVerbosityLevel?.(pdfjs.VerbosityLevel?.ERRORS ?? 0);

const results = [];
let failures = 0;

for (const fixtureName of fixtureNames) {
  const filePath = path.join(fixtureDir, fixtureName);
  if (!fs.existsSync(filePath)) {
    results.push({
      fixture: fixtureName,
      status: "missing",
      message: "Fixture is not present yet."
    });
    continue;
  }

  try {
    const result = await validateFixture(filePath);
    results.push({
      fixture: fixtureName,
      status: "passed",
      ...result
    });
  } catch (error) {
    failures += 1;
    results.push({
      fixture: fixtureName,
      status: "failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

for (const result of results) {
  console.log(formatResult(result));
}

const validated = results.filter((result) => result.status === "passed").length;
const missing = results.filter((result) => result.status === "missing").length;
console.log(`\nSummary: ${validated} passed, ${missing} missing, ${failures} failed.`);

if (validated === 0 || failures > 0) {
  process.exitCode = 1;
}

async function validateFixture(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    isEvalSupported: false,
    standardFontDataUrl,
    useWorkerFetch: false
  });
  const pdf = await loadingTask.promise;
  const textItems = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent({ includeMarkedContent: false });
    for (const item of textContent.items) {
      const text = typeof item.str === "string" ? item.str.trim() : "";
      if (!text) continue;

      const transform = Array.isArray(item.transform) ? item.transform : [];
      const rawX = Number(transform[4] ?? 0);
      const rawY = Number(transform[5] ?? 0);
      const width = positiveNumber(item.width) ?? Math.abs(Number(transform[0] ?? 0));
      const height = positiveNumber(item.height) ?? Math.abs(Number(transform[3] ?? 0));
      textItems.push({
        pageNumber,
        text,
        x: round(rawX),
        y: round(viewport.height - rawY),
        width: round(width),
        height: round(height)
      });
    }
  }

  await pdf.destroy();

  assert(textItems.length > 0, "No text items were extracted.");
  const paragraphs = buildParagraphs(textItems);
  assert(paragraphs.length > 0, "No paragraphs were built from text items.");
  const paragraphPositions = mapParagraphsToTextItems(paragraphs, textItems);
  assert(paragraphPositions.length > 0, "No paragraph positions were generated.");

  const positioned = paragraphPositions.filter((position) => position.boundingBox);
  assert(positioned.length > 0, "No paragraph bounding boxes were generated.");

  for (const position of positioned) {
    const box = position.boundingBox;
    assertFiniteBox(box, position.paragraphId);
  }

  return {
    pageCount: pdf.numPages,
    textItemCount: textItems.length,
    paragraphCount: paragraphs.length,
    positionedParagraphCount: positioned.length,
    coordinateAvailable: true,
    firstBoundingBox: positioned[0].boundingBox
  };
}

function buildParagraphs(textItems) {
  const byPage = new Map();
  for (const item of textItems) {
    const items = byPage.get(item.pageNumber) ?? [];
    items.push(item);
    byPage.set(item.pageNumber, items);
  }

  const paragraphs = [];
  for (const [pageNumber, items] of byPage.entries()) {
    const text = items.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    paragraphs.push({
      id: `p-${paragraphs.length + 1}`,
      pageNumber,
      text
    });
  }
  return paragraphs;
}

function mapParagraphsToTextItems(paragraphs, textItems) {
  return paragraphs.map((paragraph) => {
    const pageItems = textItems.filter((item) => item.pageNumber === paragraph.pageNumber);
    return {
      paragraphId: paragraph.id,
      pageNumber: paragraph.pageNumber,
      confidence: "medium",
      boundingBox: pageItems.length ? boundingBox(pageItems) : null
    };
  });
}

function boundingBox(items) {
  const minX = Math.min(...items.map((item) => item.x));
  const minY = Math.min(...items.map((item) => item.y));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  const maxY = Math.max(...items.map((item) => item.y + item.height));
  return {
    x: round(minX),
    y: round(minY),
    width: round(maxX - minX),
    height: round(maxY - minY)
  };
}

function assertFiniteBox(box, label) {
  assert(box, `Missing bounding box for ${label}.`);
  for (const key of ["x", "y", "width", "height"]) {
    assert(Number.isFinite(box[key]), `Invalid ${key} in bounding box for ${label}.`);
  }
  assert(box.width > 0, `Bounding box width must be positive for ${label}.`);
  assert(box.height > 0, `Bounding box height must be positive for ${label}.`);
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function round(value) {
  return Number(value.toFixed(2));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function formatResult(result) {
  if (result.status === "missing") {
    return `[missing] ${result.fixture}: ${result.message}`;
  }
  if (result.status === "failed") {
    return `[failed] ${result.fixture}: ${result.message}`;
  }
  return [
    `[passed] ${result.fixture}`,
    `pages=${result.pageCount}`,
    `textItems=${result.textItemCount}`,
    `paragraphs=${result.paragraphCount}`,
    `positioned=${result.positionedParagraphCount}`,
    `firstBox=${JSON.stringify(result.firstBoundingBox)}`
  ].join(" ");
}
