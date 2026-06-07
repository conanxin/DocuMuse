import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveDocumentKindFixture(request, parent, isMain, options) {
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

const fixtures = [
  {
    name: "paper",
    expected: "paper",
    text: `Abstract
This study investigates retrieval quality in document reading systems.
Introduction
We describe the research question and related work.
Method
The method compares paragraph retrieval and outline-aware chunking.
Results
The results show improved citation grounding.
Conclusion
The paper discusses limitations and future work.
References
[1] Smith et al. Journal of Document AI. DOI: 10.0000/example.`
  },
  {
    name: "interview",
    expected: "interview",
    text: `Interviewer: How did the project begin?
Interviewee: It started with a local PDF reading workflow.
Q: What was the hardest part?
A: Keeping citations grounded in the source document.
问：你最看重什么？
答：可追溯的引用和清晰的观点。
Q: What should readers remember?
A: The workflow is local-first and source-aware.`
  },
  {
    name: "business-report",
    expected: "business-report",
    text: `2025 Annual Report
Revenue increased across the cloud business segment.
The board reviewed corporate governance, risk management, ESG targets, cash flow, and shareholder value.
Strategy priorities include market expansion, product margin, and operational efficiency.`
  },
  {
    name: "fiction",
    expected: "fiction",
    text: `第一章 雨夜
他推开门，说：“你终于来了。”她望向窗外，城市的灯光像潮水一样漫过街道。
第二章 旧信
主人公发现一封改变命运的信，人物关系和情节由此展开。`
  },
  {
    name: "manual",
    expected: "manual",
    text: `Installation Guide
Step 1: Install the package.
Step 2: Configure the API endpoint.
Parameters:
- baseUrl
- timeout
Troubleshooting
If the service fails to start, check configuration and FAQ.
注意事项：请勿在公开环境中暴露密钥。`
  },
  {
    name: "article",
    expected: "article",
    text: `Local-first software is becoming more attractive as teams look for faster feedback loops and stronger control over data.
This article explains why document tools can benefit from local storage, clear exports, and simple workflows.
The main idea is that small, practical features often matter more than a large platform in early product stages.
Readers usually need a tool that opens quickly, keeps files nearby, and turns outputs into reusable notes.
Instead of using a formal template, it offers a continuous explanation of product tradeoffs, user experience, and practical adoption.
This kind of medium-length prose should be treated as a general article when no stronger document-kind signals are present.`
  },
  {
    name: "interview-like fiction dialogue",
    expected: "fiction",
    text: `第一章 访客
“你为什么回来？”她问。
“因为那封信。”他说。
窗外的雨声遮住了脚步声，主人公意识到故事才刚刚开始。
第二章 迷雾
人物之间的冲突逐渐浮现，情节沿着旧日秘密展开。`
  },
  {
    name: "business-report-like article",
    expected: "article",
    text: `This article discusses why revenue, strategy, and market share are common topics in technology writing.
It is not an annual report and does not present shareholder letters, audited cash flow, or corporate governance data.
Instead, it explains how product teams use business metrics as part of a broader narrative about adoption and user experience.
The argument is written as a general essay, with examples and opinion, rather than a formal company report.
Readers should treat the piece as analysis prose, not as a financial disclosure document.`
  },
  {
    name: "manual-like technical article",
    expected: "article",
    text: `A good API guide often mentions configuration, parameters, setup, and troubleshooting, but this article focuses on why those ideas matter.
It compares different documentation styles and explains how teams can make technical writing more approachable.
There are no step-by-step installation instructions, no command reference, and no parameter table.
The main point is editorial: clear examples and careful structure help readers understand a product faster.`
  }
];

let passed = 0;
let failed = 0;

for (const fixture of fixtures) {
  const result = detectDocumentKind({ text: fixture.text });
  const ok = result.kind === fixture.expected;
  if (ok) {
    passed += 1;
    console.log(`[passed] ${fixture.name} => ${result.kind} confidence=${result.confidence} reasons=${result.reasons.length}`);
  } else {
    failed += 1;
    console.error(`[failed] ${fixture.name} expected=${fixture.expected} actual=${result.kind} confidence=${result.confidence}`);
    console.error(`  reasons: ${result.reasons.join(" | ")}`);
  }
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
