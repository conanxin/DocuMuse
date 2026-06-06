import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();
const fixtureDir = path.join(rootDir, ".tools", "test-fixtures", "pdf-coordinate");
const manifestPath = path.join(fixtureDir, "manifest.json");
const standardFontDataUrl = pathToFileURL(path.join(rootDir, "node_modules", "pdfjs-dist", "standard_fonts") + path.sep).href;

const originalConsoleWarn = console.warn.bind(console);
console.warn = (...args) => {
  const message = args.join(" ");
  if (message.includes("Unable to load font data") || message.includes("standardFontDataUrl")) return;
  originalConsoleWarn(...args);
};

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
pdfjs.setVerbosityLevel?.(pdfjs.VerbosityLevel?.ERRORS ?? 0);

const manifest = readManifest();
const results = [];
let failures = 0;

for (const fixture of manifest.fixtures) {
  const filePath = path.join(fixtureDir, fixture.file);

  if (fixture.status === "pending") {
    results.push({
      fixture: fixture.file,
      status: "pending",
      purpose: fixture.purpose
    });
    continue;
  }

  if (fixture.status !== "active") {
    failures += 1;
    results.push({
      fixture: fixture.file,
      status: "failed",
      message: `Unknown fixture status: ${fixture.status}`
    });
    continue;
  }

  if (!fs.existsSync(filePath)) {
    failures += 1;
    results.push({
      fixture: fixture.file,
      status: "failed",
      message: "Active fixture is missing."
    });
    continue;
  }

  try {
    const result = await validateFixture(filePath, fixture);
    results.push({
      fixture: fixture.file,
      status: "passed",
      purpose: fixture.purpose,
      ...result
    });
  } catch (error) {
    failures += 1;
    results.push({
      fixture: fixture.file,
      status: "failed",
      purpose: fixture.purpose,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

for (const result of results) {
  console.log(formatResult(result));
}

const passed = results.filter((result) => result.status === "passed").length;
const pending = results.filter((result) => result.status === "pending").length;
console.log(`\nSummary: ${passed} passed, ${pending} pending, ${failures} failed.`);

if (passed === 0 || failures > 0) {
  process.exitCode = 1;
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Fixture manifest not found: ${manifestPath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(parsed.fixtures)) {
    throw new Error("Fixture manifest must contain a fixtures array.");
  }
  return parsed;
}

async function validateFixture(filePath, fixture) {
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

  assertAtLeast(pdf.numPages, fixture.expectedMinPages ?? 1, "pageCount");
  assertAtLeast(textItems.length, fixture.expectedMinTextItems ?? 1, "textItemCount");

  const paragraphs = buildParagraphs(textItems);
  assertAtLeast(paragraphs.length, fixture.expectedMinParagraphs ?? 1, "paragraphCount");

  const distinctPages = new Set(textItems.map((item) => item.pageNumber)).size;
  if (fixture.expectedMinDistinctPages) {
    assertAtLeast(distinctPages, fixture.expectedMinDistinctPages, "distinctPageCount");
  }

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
    distinctPageCount: distinctPages,
    positionedParagraphCount: positioned.length,
    coordinateAvailable: true,
    firstBoundingBox: positioned[0].boundingBox
  };
}

function buildParagraphs(textItems) {
  return textItems
    .filter((item) => item.text.trim().length >= 2)
    .map((item, index) => ({
      id: `p-${index + 1}`,
      pageNumber: item.pageNumber,
      text: item.text,
      sourceItem: item
    }));
}

function mapParagraphsToTextItems(paragraphs, textItems) {
  return paragraphs.map((paragraph) => {
    const item = paragraph.sourceItem ?? textItems.find((candidate) => candidate.pageNumber === paragraph.pageNumber);
    return {
      paragraphId: paragraph.id,
      pageNumber: paragraph.pageNumber,
      confidence: "medium",
      boundingBox: item ? boundingBox([item]) : null
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
  assert(box.x >= 0, `Bounding box x must not be negative for ${label}.`);
  assert(box.y >= 0, `Bounding box y must not be negative for ${label}.`);
  assert(box.width > 0, `Bounding box width must be positive for ${label}.`);
  assert(box.height > 0, `Bounding box height must be positive for ${label}.`);
}

function assertAtLeast(actual, expected, label) {
  assert(actual >= expected, `${label} expected >= ${expected}, got ${actual}.`);
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
  if (result.status === "pending") {
    return `[pending] ${result.fixture}: ${result.purpose}`;
  }
  if (result.status === "failed") {
    return `[failed] ${result.fixture}: ${result.message}`;
  }
  return [
    `[passed] ${result.fixture}`,
    `pages=${result.pageCount}`,
    `distinctPages=${result.distinctPageCount}`,
    `textItems=${result.textItemCount}`,
    `paragraphs=${result.paragraphCount}`,
    `positioned=${result.positionedParagraphCount}`,
    `firstBox=${JSON.stringify(result.firstBoundingBox)}`
  ].join(" ");
}
