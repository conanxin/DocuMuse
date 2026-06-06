import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();
const fixtureDir = path.join(rootDir, ".tools", "test-fixtures", "pdf-coordinate");
const edgePath = findEdgeExecutable();

fs.mkdirSync(fixtureDir, { recursive: true });

const fixtures = [
  {
    file: "simple-multipage.pdf",
    html: pageShell(
      "simple multipage",
      `
      <section class="page">
        <h1>DocuMuse Coordinate Fixture Page 1</h1>
        <p>Page one contains a short paragraph for source navigation tests.</p>
        <p>Anchor text: MULTIPAGE PAGE ONE.</p>
      </section>
      <section class="page">
        <h1>DocuMuse Coordinate Fixture Page 2</h1>
        <p>Page two contains different text to verify page number routing.</p>
        <p>Anchor text: MULTIPAGE PAGE TWO.</p>
      </section>
      <section class="page last">
        <h1>DocuMuse Coordinate Fixture Page 3</h1>
        <p>Page three confirms that later PDF pages can still produce text coordinates.</p>
        <p>Anchor text: MULTIPAGE PAGE THREE.</p>
      </section>
      `
    )
  },
  {
    file: "dense-paragraphs.pdf",
    html: pageShell(
      "dense paragraphs",
      `
      <section class="page dense">
        <h1>Dense Paragraph Coordinate Fixture</h1>
        ${Array.from({ length: 12 }, (_, index) => `<p><strong>Paragraph ${index + 1}.</strong> This paragraph contains enough text to create a separate coordinate region for mapping validation. DocuMuse should be able to extract the text item boxes and build several paragraph positions.</p>`).join("\n")}
      </section>
      `
    )
  },
  {
    file: "two-column.pdf",
    html: pageShell(
      "two column",
      `
      <section class="page">
        <h1>Two Column Coordinate Fixture</h1>
        <div class="columns">
          ${Array.from({ length: 10 }, (_, index) => `<p><strong>Column paragraph ${index + 1}.</strong> This text is laid out with CSS columns to create a lightweight multi-column coordinate case.</p>`).join("\n")}
        </div>
      </section>
      `
    )
  }
];

for (const fixture of fixtures) {
  const htmlPath = path.join(os.tmpdir(), `documuse-${fixture.file}.html`);
  const pdfPath = path.join(fixtureDir, fixture.file);
  fs.writeFileSync(htmlPath, fixture.html, "utf8");
  const result = spawnSync(
    edgePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=${path.join(os.tmpdir(), `documuse-edge-${Date.now()}-${Math.random().toString(16).slice(2)}`)}`,
      `--print-to-pdf=${pdfPath}`,
      "--print-to-pdf-no-header",
      pathToFileURL(htmlPath).href
    ],
    { encoding: "utf8" }
  );

  fs.rmSync(htmlPath, { force: true });
  if (result.status !== 0 || !fs.existsSync(pdfPath)) {
    throw new Error(`Failed to generate ${fixture.file}: ${result.stderr || result.stdout || "unknown error"}`);
  }
  console.log(`generated ${fixture.file}`);
}

function pageShell(title, body) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: Letter; margin: 0.7in; }
    body {
      margin: 0;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15px;
      line-height: 1.55;
    }
    h1 {
      color: #2563eb;
      font-size: 24px;
      margin: 0 0 24px;
    }
    p {
      margin: 0 0 16px;
    }
    .page {
      break-after: page;
      min-height: 8.2in;
    }
    .page.last {
      break-after: auto;
    }
    .dense p {
      margin-bottom: 13px;
    }
    .columns {
      column-count: 2;
      column-gap: 36px;
    }
    .columns p {
      break-inside: avoid;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function findEdgeExecutable() {
  const candidates = [
    process.env.EDGE_EXECUTABLE,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Microsoft Edge was not found. Set EDGE_EXECUTABLE to generate PDF fixtures.");
}
