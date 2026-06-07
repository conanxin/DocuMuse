import pptxgen from "pptxgenjs";
import { documentKindLabel, getEffectiveDocumentKind } from "../documentKindDetector";
import type { DocumentChatMessage, ParsedDocument } from "../documentTypes";
import type { PptxCoverStyle, PptxExportOptions, PptxThemeName } from "./exportTypes";

type PptxTheme = {
  blue: string;
  dark: string;
  gray: string;
  lightGray: string;
  border: string;
  paleBlue: string;
  white: string;
  accentBorder: string;
  decorative: string;
};

const PPTX_THEMES: Record<PptxThemeName, PptxTheme> = {
  blue: {
    blue: "2563EB",
    dark: "111827",
    gray: "64748B",
    lightGray: "F1F5F9",
    border: "E2E8F0",
    paleBlue: "EFF6FF",
    white: "FFFFFF",
    accentBorder: "BFDBFE",
    decorative: "DBEAFE"
  },
  green: {
    blue: "059669",
    dark: "111827",
    gray: "64748B",
    lightGray: "F1F5F9",
    border: "D1FAE5",
    paleBlue: "ECFDF5",
    white: "FFFFFF",
    accentBorder: "A7F3D0",
    decorative: "BBF7D0"
  },
  purple: {
    blue: "7C3AED",
    dark: "111827",
    gray: "64748B",
    lightGray: "F8FAFC",
    border: "E9D5FF",
    paleBlue: "F5F3FF",
    white: "FFFFFF",
    accentBorder: "DDD6FE",
    decorative: "EDE9FE"
  },
  slate: {
    blue: "334155",
    dark: "111827",
    gray: "64748B",
    lightGray: "F8FAFC",
    border: "CBD5E1",
    paleBlue: "F8FAFC",
    white: "FFFFFF",
    accentBorder: "CBD5E1",
    decorative: "E2E8F0"
  }
};

const DEFAULT_PPTX_OPTIONS: PptxExportOptions = {
  theme: "blue",
  cover: "report",
  includeSummary: true,
  includeKeyPoints: true,
  includeKeywords: true,
  includeSections: true,
  includeOutline: true,
  includeCreative: true,
  includeChat: true
};

const BASE_THEME = {
  blue: "2563EB",
  dark: "111827",
  gray: "64748B",
  lightGray: "F1F5F9",
  border: "E2E8F0",
  paleBlue: "EFF6FF",
  white: "FFFFFF",
  accentBorder: "BFDBFE",
  decorative: "DBEAFE"
};

let THEME = BASE_THEME;

const SLIDE = {
  width: 13.333,
  height: 7.5,
  marginX: 0.62,
  titleY: 0.36,
  footerY: 7.08
};

const EMPTY_ANALYSIS = "灏氭湭鐢熸垚鍒嗘瀽缁撴灉";
const EMPTY_CHAT = "鏆傛棤闂瓟璁板綍";
const EMPTY_OUTLINE = "灏氭湭鐢熸垚 PPT 澶х翰";
const EMPTY_GENERATED = "灏氭湭鐢熸垚";

type PptxDocument = InstanceType<typeof pptxgen>;
type PptxSlide = ReturnType<PptxDocument["addSlide"]>;

type CardOptions = {
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  body?: string;
  fill?: string;
  accent?: boolean;
  bodyMax?: number;
  titleSize?: number;
  bodySize?: number;
  bodyColor?: string;
};

type ChatRound = {
  question: string;
  answer: string;
  sources: NonNullable<DocumentChatMessage["sources"]>;
};

export async function buildDocumentPptxExport(document: ParsedDocument, options: Partial<PptxExportOptions> = {}): Promise<Buffer> {
  const exportOptions = normalizePptxExportOptions(options);
  THEME = PPTX_THEMES[exportOptions.theme];
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "DocuMuse";
  pptx.company = "DocuMuse";
  pptx.subject = "DocuMuse document analysis export";
  pptx.title = cleanPptText(document.title || document.filename || "DocuMuse Export");
  pptx.theme = {
    headFontFace: "Arial",
    bodyFontFace: "Arial"
  };

  let page = 1;
  addCoverSlide(pptx, document, exportOptions.cover);
  if (exportOptions.includeSummary) addSummarySlide(pptx, document, page++);
  if (exportOptions.includeKeyPoints) page = addKeyPointsSlides(pptx, document, page);
  if (exportOptions.includeKeywords) addKeywordsSlide(pptx, document, page++);
  if (exportOptions.includeSections) page = addSectionSlides(pptx, document, page);
  if (exportOptions.includeOutline) page = addPptOutlineSlides(pptx, document, page);
  if (exportOptions.includeCreative) {
    addPodcastSlide(pptx, document, page++);
    page = addImagePromptSlides(pptx, document, page);
  }
  if (exportOptions.includeChat) page = addChatSlides(pptx, document, page);
  addClosingSlide(pptx, page++);

  const output = await pptx.write({ outputType: "nodebuffer", compression: true });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

export function normalizePptxExportOptions(options: Partial<PptxExportOptions> = {}): PptxExportOptions {
  return {
    ...DEFAULT_PPTX_OPTIONS,
    ...options,
    theme: isPptxTheme(options.theme) ? options.theme : DEFAULT_PPTX_OPTIONS.theme,
    cover: isPptxCoverStyle(options.cover) ? options.cover : DEFAULT_PPTX_OPTIONS.cover
  };
}

function isPptxTheme(value: unknown): value is PptxThemeName {
  return value === "blue" || value === "green" || value === "purple" || value === "slate";
}

function isPptxCoverStyle(value: unknown): value is PptxCoverStyle {
  return value === "standard" || value === "minimal" || value === "report";
}

function addCoverSlide(pptx: PptxDocument, document: ParsedDocument, cover: PptxCoverStyle) {
  if (cover === "minimal") {
    addMinimalCoverSlide(pptx, document);
    return;
  }
  if (cover === "report") {
    addReportCoverSlide(pptx, document);
    return;
  }
  addStandardCoverSlide(pptx, document);
}

function addStandardCoverSlide(pptx: PptxDocument, document: ParsedDocument) {
  const slide = newBaseSlide(pptx);
  slide.addShape(pptx.ShapeType.rect, {
    x: 10.15,
    y: 0,
    w: 3.18,
    h: 7.5,
    fill: { color: THEME.paleBlue },
    line: { color: THEME.paleBlue }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 10.72,
    y: 0.86,
    w: 1.78,
    h: 5.55,
    fill: { color: THEME.decorative, transparency: 35 },
    line: { color: THEME.decorative, transparency: 100 }
  });

  slide.addText("DocuMuse", {
    x: SLIDE.marginX,
    y: 0.55,
    w: 2.8,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: THEME.blue
  });
  slide.addText(truncateText(document.title || document.filename, 96), {
    x: SLIDE.marginX,
    y: 1.48,
    w: 8.85,
    h: 1.32,
    fontSize: 33,
    bold: true,
    color: THEME.dark,
    fit: "shrink",
    breakLine: false
  });
  slide.addText("AI Document Reading Report", {
    x: SLIDE.marginX,
    y: 3.0,
    w: 5.6,
    h: 0.35,
    fontSize: 16,
    color: THEME.gray
  });

  addMetadataCard(slide, {
    x: SLIDE.marginX,
    y: 3.95,
    w: 6.6,
    h: 1.95,
    rows: [
      ["文件", truncateText(document.filename, 52)],
      ["类型", documentKindLabel(getEffectiveDocumentKind(document).kind)],
      ["服务", document.analysisProvider || "未生成"],
      ["模型", document.analysisModel || "未生成"],
      ["导出", new Date().toLocaleString("zh-CN")]
    ]
  });

  slide.addText("Generated by DocuMuse", {
    x: SLIDE.marginX,
    y: 6.62,
    w: 4.8,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: THEME.blue
  });
}

function addMinimalCoverSlide(pptx: PptxDocument, document: ParsedDocument) {
  const slide = newBaseSlide(pptx);
  slide.addText("DocuMuse", {
    x: SLIDE.marginX,
    y: 0.62,
    w: 2.8,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: THEME.blue
  });
  slide.addShape("line", { x: SLIDE.marginX, y: 1.14, w: 2.25, h: 0, line: { color: THEME.blue, width: 2 } });
  slide.addText(truncateText(document.title || document.filename, 100), {
    x: SLIDE.marginX,
    y: 2.02,
    w: 10.4,
    h: 1.35,
    fontSize: 36,
    bold: true,
    color: THEME.dark,
    fit: "shrink"
  });
  slide.addText("AI Document Reading Report", {
    x: SLIDE.marginX,
    y: 3.48,
    w: 5.6,
    h: 0.35,
    fontSize: 15,
    color: THEME.gray
  });
  addMetadataCard(slide, {
    x: SLIDE.marginX,
    y: 4.46,
    w: 6.6,
    h: 1.55,
    rows: [
      ["文件", truncateText(document.filename, 52)],
      ["类型", documentKindLabel(getEffectiveDocumentKind(document).kind)],
      ["服务", document.analysisProvider || "未生成"],
      ["模型", document.analysisModel || "未生成"]
    ]
  });
  slide.addText(`瀵煎嚭锛?{new Date().toLocaleString("zh-CN")}`, {
    x: SLIDE.marginX,
    y: 6.55,
    w: 4.6,
    h: 0.24,
    fontSize: 10.5,
    color: THEME.gray
  });
}

function addReportCoverSlide(pptx: PptxDocument, document: ParsedDocument) {
  const slide = newBaseSlide(pptx);
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE.width,
    h: SLIDE.height,
    fill: { color: THEME.white },
    line: { color: THEME.white }
  });
  slide.addShape("roundRect", {
    x: 8.35,
    y: 0.62,
    w: 4.36,
    h: 6.2,
    rectRadius: 0.12,
    fill: { color: THEME.paleBlue },
    line: { color: THEME.accentBorder, width: 1 }
  });
  slide.addText("DocuMuse", { x: SLIDE.marginX, y: 0.55, w: 2.8, h: 0.35, fontSize: 16, bold: true, color: THEME.blue });
  slide.addText(truncateText(document.title || document.filename, 98), {
    x: SLIDE.marginX,
    y: 1.42,
    w: 7.2,
    h: 1.35,
    fontSize: 33,
    bold: true,
    color: THEME.dark,
    fit: "shrink"
  });
  slide.addText("AI Document Reading Report", { x: SLIDE.marginX, y: 2.96, w: 5.8, h: 0.35, fontSize: 16, color: THEME.gray });
  addMetadataCard(slide, {
    x: SLIDE.marginX,
    y: 3.86,
    w: 6.8,
    h: 1.95,
    rows: [
      ["文件", truncateText(document.filename, 52)],
      ["类型", documentKindLabel(getEffectiveDocumentKind(document).kind)],
      ["服务", document.analysisProvider || "未生成"],
      ["模型", document.analysisModel || "未生成"],
      ["导出", new Date().toLocaleString("zh-CN")]
    ]
  });
  const keywords = (document.analysis?.keywords ?? []).slice(0, 8);
  slide.addText("关键词预览", { x: 8.76, y: 1.05, w: 3.5, h: 0.28, fontSize: 13, bold: true, color: THEME.blue });
  if (keywords.length) {
    addTagList(slide, keywords, { x: 8.76, y: 1.55, w: 3.35, h: 2.2 });
  } else {
    slide.addText("尚未生成关键词", { x: 8.76, y: 1.55, w: 3.35, h: 0.3, fontSize: 11, color: THEME.gray });
  }
  slide.addText("Generated by DocuMuse", { x: 8.76, y: 6.1, w: 3.2, h: 0.28, fontSize: 12, bold: true, color: THEME.blue });
}

function addSummarySlide(pptx: PptxDocument, document: ParsedDocument, page: number) {
  const slide = newContentSlide(pptx, "鎽樿", "Concise reading summary", page);
  const hasAnalysis = document.analysisStatus === "completed";
  addCard(slide, {
    x: SLIDE.marginX,
    y: 1.28,
    w: 12.05,
    h: 1.5,
    title: "涓€鍙ヨ瘽鎽樿",
    body: hasAnalysis ? document.analysis?.oneSentenceSummary || EMPTY_ANALYSIS : EMPTY_ANALYSIS,
    fill: THEME.paleBlue,
    accent: true,
    bodySize: 17,
    bodyMax: 210
  });
  addCard(slide, {
    x: SLIDE.marginX,
    y: 3.15,
    w: 12.05,
    h: 2.28,
    title: "鍏ㄦ枃鎽樿",
    body: hasAnalysis ? document.analysis?.summary || EMPTY_ANALYSIS : EMPTY_ANALYSIS,
    bodySize: 14.8,
    bodyMax: 450
  });
}

function addKeyPointsSlides(pptx: PptxDocument, document: ParsedDocument, startPage: number) {
  const points = document.analysis?.keyPoints ?? [];
  if (!points.length) {
    const slide = newContentSlide(pptx, "鏍稿績瑙傜偣", "Top takeaways", startPage);
    addCard(slide, { x: SLIDE.marginX, y: 1.45, w: 12.05, h: 1.4, body: EMPTY_ANALYSIS, bodySize: 16 });
    return startPage + 1;
  }

  let page = startPage;
  splitIntoSlides(points, 6).forEach((group, groupIndex) => {
    const title = points.length > 6 ? `核心观点 ${groupIndex + 1}` : "核心观点";
    const slide = newContentSlide(pptx, title, "Top takeaways", page++);
    group.forEach((point, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = SLIDE.marginX + col * 6.18;
      const y = 1.28 + row * 1.78;
      addNumberedCard(slide, {
        x,
        y,
        w: 5.82,
        h: 1.34,
        number: groupIndex * 6 + index + 1,
        body: truncateText(point, 110),
        fill: index % 2 === 0 ? THEME.paleBlue : THEME.lightGray
      });
    });
  });
  return page;
}

function addKeywordsSlide(pptx: PptxDocument, document: ParsedDocument, page: number) {
  const slide = newContentSlide(pptx, "关键词", "Core concepts", page);
  const keywords = (document.analysis?.keywords ?? []).slice(0, 20);
  if (!keywords.length) {
    addCard(slide, { x: SLIDE.marginX, y: 1.45, w: 12.05, h: 1.4, body: EMPTY_ANALYSIS, bodySize: 16 });
    return;
  }
  addTagList(slide, keywords, { x: SLIDE.marginX, y: 1.35, w: 12.05, h: 4.9 });
}

function addSectionSlides(pptx: PptxDocument, document: ParsedDocument, startPage: number) {
  const sections = document.analysis?.sectionSummaries ?? [];
  if (!sections.length) {
    const slide = newContentSlide(pptx, "分段分析", "Section-level knowledge cards", startPage);
    addCard(slide, { x: SLIDE.marginX, y: 1.45, w: 12.05, h: 1.4, body: EMPTY_ANALYSIS, bodySize: 16 });
    return startPage + 1;
  }

  let page = startPage;
  splitIntoSlides(sections, 2).forEach((group, groupIndex) => {
    const title = sections.length > 2 ? `分段分析 ${groupIndex + 1}` : "分段分析";
    const slide = newContentSlide(pptx, title, "Section-level knowledge cards", page++);
    group.forEach((section, index) => {
      const y = 1.28 + index * 2.78;
      const summary = `一句话摘要：${truncateText(section.summary || EMPTY_ANALYSIS, 160)}`;
      const bullets = (section.keyPoints ?? []).slice(0, 3).map((item) => `- ${truncateText(item, 80)}`);
      addCard(slide, {
        x: SLIDE.marginX,
        y,
        w: 12.05,
        h: 2.18,
        title: section.title || `第 ${groupIndex * 2 + index + 1} 节`,
        body: [summary, bullets.length ? "要点：" : "", ...bullets].filter(Boolean).join("\n"),
        fill: index === 0 ? THEME.paleBlue : THEME.lightGray,
        accent: index === 0,
        bodySize: 12.4,
        bodyMax: 360
      });
    });
  });
  return page;
}

function addPptOutlineSlides(pptx: PptxDocument, document: ParsedDocument, startPage: number) {
  const outline = document.analysis?.pptOutline ?? [];
  if (!outline.length) {
    const slide = newContentSlide(pptx, "PPT 大纲", "Generated outline", startPage);
    addCard(slide, { x: SLIDE.marginX, y: 1.45, w: 12.05, h: 1.4, body: EMPTY_OUTLINE, bodySize: 16 });
    return startPage + 1;
  }

  let page = startPage;
  splitIntoSlides(outline, 3).forEach((group, groupIndex) => {
    const title = outline.length > 3 ? `PPT 大纲 ${groupIndex + 1}` : "PPT 大纲";
    const slide = newContentSlide(pptx, title, "Slide cards from generated outline", page++);
    group.forEach((item, index) => {
      addCard(slide, {
        x: SLIDE.marginX,
        y: 1.2 + index * 1.82,
        w: 12.05,
        h: 1.38,
        title: `Slide ${groupIndex * 3 + index + 1}: ${truncateText(item.title || "未命名", 62)}`,
        body: formatBullets((item.bullets ?? []).slice(0, 3), 70).join("\n") || EMPTY_GENERATED,
        bodySize: 12.2,
        bodyMax: 250
      });
    });
  });
  return page;
}

function addPodcastSlide(pptx: PptxDocument, document: ParsedDocument, page: number) {
  const slide = newContentSlide(pptx, "播客脚本", "Script excerpt only. No audio is generated.", page);
  const paragraphs = compactParagraphs(document.analysis?.podcastScript || EMPTY_GENERATED, 3, 600);
  addCard(slide, {
    x: SLIDE.marginX,
    y: 1.28,
    w: 12.05,
    h: 4.3,
    title: "脚本摘录",
    body: paragraphs,
    bodySize: 14.2,
    bodyMax: 620
  });
}

function addImagePromptSlides(pptx: PptxDocument, document: ParsedDocument, startPage: number) {
  const prompts = document.analysis?.imagePrompts ?? [];
  if (!prompts.length) {
    const slide = newContentSlide(pptx, "图片提示词", "Text prompts only. No images are generated.", startPage);
    addCard(slide, { x: SLIDE.marginX, y: 1.45, w: 12.05, h: 1.4, body: EMPTY_GENERATED, bodySize: 16 });
    return startPage + 1;
  }

  let page = startPage;
  splitIntoSlides(prompts, 3).forEach((group, groupIndex) => {
    const title = prompts.length > 3 ? `图片提示词 ${groupIndex + 1}` : "图片提示词";
    const slide = newContentSlide(pptx, title, "Text prompts only. No images are generated.", page++);
    group.forEach((item, index) => {
      addCard(slide, {
        x: SLIDE.marginX,
        y: 1.2 + index * 1.82,
        w: 12.05,
        h: 1.38,
        title: item.title || `提示词 ${groupIndex * 3 + index + 1}`,
        body: item.prompt || EMPTY_GENERATED,
        bodySize: 12.1,
        bodyMax: 150
      });
    });
  });
  return page;
}

function addChatSlides(pptx: PptxDocument, document: ParsedDocument, startPage: number) {
  const rounds = recentChatRounds(document.chatMessages ?? [], 5);
  if (!rounds.length) {
    const slide = newContentSlide(pptx, "文档问答", "Recent grounded question-answer records", startPage);
    addCard(slide, { x: SLIDE.marginX, y: 1.45, w: 12.05, h: 1.4, body: EMPTY_CHAT, bodySize: 16 });
    return startPage + 1;
  }

  let page = startPage;
  splitIntoSlides(rounds, 2).forEach((group, groupIndex) => {
    const title = rounds.length > 2 ? `文档问答 ${groupIndex + 1}` : "文档问答";
    const slide = newContentSlide(pptx, title, "Questions, concise answers, and short source hints", page++);
    group.forEach((round, index) => {
      addQaCard(slide, round, {
        x: SLIDE.marginX,
        y: 1.18 + index * 2.82,
        w: 12.05,
        h: 2.28
      });
    });
  });
  return page;
}

function addClosingSlide(pptx: PptxDocument, page: number) {
  const slide = newBaseSlide(pptx);
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE.width,
    h: SLIDE.height,
    fill: { color: THEME.paleBlue },
    line: { color: THEME.paleBlue }
  });
  slide.addText("Generated by DocuMuse", {
    x: 2.05,
    y: 2.55,
    w: 9.3,
    h: 0.7,
    fontSize: 34,
    bold: true,
    color: THEME.blue,
    align: "center"
  });
  slide.addText("AI Document Reading Workspace", {
    x: 3.0,
    y: 3.38,
    w: 7.4,
    h: 0.38,
    fontSize: 15,
    color: THEME.gray,
    align: "center"
  });
  slide.addText(`瀵煎嚭鏃堕棿锛?{new Date().toLocaleString("zh-CN")}`, {
    x: 3.0,
    y: 4.02,
    w: 7.4,
    h: 0.28,
    fontSize: 11,
    color: THEME.gray,
    align: "center"
  });
  addFooter(slide, page);
}

function newBaseSlide(pptx: PptxDocument) {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.white };
  return slide;
}

function newContentSlide(pptx: PptxDocument, title: string, subtitle: string, page: number) {
  const slide = newBaseSlide(pptx);
  addSlideTitle(slide, title, subtitle);
  addFooter(slide, page);
  return slide;
}

function addSlideTitle(slide: PptxSlide, title: string, subtitle?: string) {
  slide.addText(title, {
    x: SLIDE.marginX,
    y: SLIDE.titleY,
    w: 8.8,
    h: 0.45,
    fontSize: 23,
    bold: true,
    color: THEME.blue,
    fit: "shrink"
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: SLIDE.marginX,
      y: 0.84,
      w: 9.8,
      h: 0.25,
      fontSize: 10.5,
      color: THEME.gray,
      fit: "shrink"
    });
  }
  slide.addShape("line", {
    x: SLIDE.marginX,
    y: 1.06,
    w: 12.05,
    h: 0,
    line: { color: THEME.border, width: 1 }
  });
}

function addFooter(slide: PptxSlide, page?: number) {
  slide.addShape("line", {
    x: SLIDE.marginX,
    y: SLIDE.footerY - 0.08,
    w: 12.05,
    h: 0,
    line: { color: THEME.border, width: 0.8 }
  });
  slide.addText("DocuMuse", {
    x: SLIDE.marginX,
    y: SLIDE.footerY,
    w: 2.1,
    h: 0.18,
    fontSize: 8.5,
    bold: true,
    color: THEME.gray
  });
  if (page) {
    slide.addText(String(page).padStart(2, "0"), {
      x: 12.0,
      y: SLIDE.footerY,
      w: 0.75,
      h: 0.18,
      fontSize: 8.5,
      color: THEME.gray,
      align: "right"
    });
  }
}

function addCard(slide: PptxSlide, options: CardOptions) {
  slide.addShape("roundRect", {
    x: options.x,
    y: options.y,
    w: options.w,
    h: options.h,
    rectRadius: 0.08,
    fill: { color: options.fill || THEME.lightGray },
    line: { color: options.accent ? THEME.accentBorder : THEME.border, width: 1 }
  });

  const textX = options.x + 0.24;
  let bodyY = options.y + 0.22;
  if (options.title) {
    slide.addText(truncateText(options.title, 92), {
      x: textX,
      y: options.y + 0.18,
      w: options.w - 0.48,
      h: 0.28,
      fontSize: options.titleSize || 13,
      bold: true,
      color: options.accent ? THEME.blue : THEME.dark,
      fit: "shrink"
    });
    bodyY = options.y + 0.58;
  }

  slide.addText(truncateText(options.body || EMPTY_GENERATED, options.bodyMax || 260), {
    x: textX,
    y: bodyY,
    w: options.w - 0.48,
    h: Math.max(0.2, options.y + options.h - bodyY - 0.18),
    fontSize: options.bodySize || 11.8,
    color: options.bodyColor || THEME.dark,
    breakLine: false,
    fit: "shrink",
    margin: 0.02
  });
}

function addMetadataCard(slide: PptxSlide, options: { x: number; y: number; w: number; h: number; rows: Array<[string, string]> }) {
  slide.addShape("roundRect", {
    x: options.x,
    y: options.y,
    w: options.w,
    h: options.h,
    rectRadius: 0.08,
    fill: { color: THEME.lightGray },
    line: { color: THEME.border, width: 1 }
  });
  slide.addText("瀵煎嚭淇℃伅", {
    x: options.x + 0.24,
    y: options.y + 0.16,
    w: options.w - 0.48,
    h: 0.26,
    fontSize: 12.5,
    bold: true,
    color: THEME.dark
  });
  options.rows.forEach(([label, value], index) => {
    const y = options.y + 0.56 + index * 0.34;
    slide.addText(`${label}：`, {
      x: options.x + 0.24,
      y,
      w: 0.85,
      h: 0.22,
      fontSize: 10.5,
      color: THEME.gray,
      fit: "shrink"
    });
    slide.addText(truncateText(value, 62), {
      x: options.x + 1.02,
      y,
      w: options.w - 1.28,
      h: 0.22,
      fontSize: 10.8,
      bold: true,
      color: THEME.dark,
      fit: "shrink"
    });
  });
}

function addNumberedCard(slide: PptxSlide, options: { x: number; y: number; w: number; h: number; number: number; body: string; fill: string }) {
  slide.addShape("roundRect", {
    x: options.x,
    y: options.y,
    w: options.w,
    h: options.h,
    rectRadius: 0.08,
    fill: { color: options.fill },
    line: { color: THEME.accentBorder, width: 1 }
  });
  slide.addText(String(options.number).padStart(2, "0"), {
    x: options.x + 0.22,
    y: options.y + 0.18,
    w: 0.72,
    h: 0.3,
    fontSize: 15,
    bold: true,
    color: THEME.blue,
    fit: "shrink"
  });
  slide.addText(truncateText(options.body, 110), {
    x: options.x + 0.92,
    y: options.y + 0.2,
    w: options.w - 1.16,
    h: options.h - 0.38,
    fontSize: 13.5,
    color: THEME.dark,
    fit: "shrink",
    margin: 0.02
  });
}

function addQaCard(slide: PptxSlide, round: ChatRound, bounds: { x: number; y: number; w: number; h: number }) {
  slide.addShape("roundRect", {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    rectRadius: 0.08,
    fill: { color: THEME.lightGray },
    line: { color: THEME.border, width: 1 }
  });
  const left = bounds.x + 0.24;
  const width = bounds.w - 0.48;
  slide.addText(`Q：${truncateText(round.question, 80)}`, {
    x: left,
    y: bounds.y + 0.18,
    w: width,
    h: 0.28,
    fontSize: 12.6,
    bold: true,
    color: THEME.blue,
    fit: "shrink"
  });
  slide.addText(`A：${truncateText(cleanAnswerForQa(round.answer), 220)}`, {
    x: left,
    y: bounds.y + 0.56,
    w: width,
    h: 0.78,
    fontSize: 11.6,
    color: THEME.dark,
    fit: "shrink",
    margin: 0.02
  });
  slide.addText("Sources", {
    x: left,
    y: bounds.y + 1.42,
    w: 1.1,
    h: 0.2,
    fontSize: 9.5,
    bold: true,
    color: THEME.gray
  });

  const sourceText = round.sources.length
    ? round.sources.slice(0, 2).map((source) => `${source.sourceHint}：${truncateText(source.quote, 80)}`).join("\n")
    : "未找到明确来源";
  slide.addText(sourceText, {
    x: left,
    y: bounds.y + 1.66,
    w: width,
    h: 0.44,
    fontSize: 9.5,
    color: THEME.gray,
    fit: "shrink",
    margin: 0.02
  });
}

function addTagList(slide: PptxSlide, tags: string[], bounds: { x: number; y: number; w: number; h: number }) {
  let x = bounds.x;
  let y = bounds.y;
  tags.forEach((tag) => {
    const label = truncateText(tag, 22);
    if (!label) return;
    const width = Math.min(2.5, Math.max(1.05, 0.34 + label.length * 0.12));
    if (x + width > bounds.x + bounds.w) {
      x = bounds.x;
      y += 0.58;
    }
    if (y + 0.4 > bounds.y + bounds.h) return;
    slide.addText(label, {
      x,
      y,
      w: width,
      h: 0.38,
      fontSize: 12.2,
      bold: true,
      color: THEME.blue,
      align: "center",
      margin: 0.04,
      fill: { color: THEME.paleBlue },
      line: { color: THEME.accentBorder, width: 1 },
      fit: "shrink"
    });
    x += width + 0.18;
  });
}

function splitIntoSlides<T>(items: T[], itemsPerSlide: number) {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += itemsPerSlide) {
    groups.push(items.slice(index, index + itemsPerSlide));
  }
  return groups;
}

function formatBullets(items: string[], maxLength: number) {
  return items.filter(Boolean).slice(0, 4).map((item) => `- ${truncateText(item, maxLength)}`);
}

function recentChatRounds(messages: DocumentChatMessage[], limit: number) {
  const rounds: ChatRound[] = [];
  let pendingQuestion = "";

  for (const message of messages) {
    if (message.role === "user") {
      pendingQuestion = message.content;
    } else if (message.role === "assistant" && pendingQuestion) {
      rounds.push({
        question: pendingQuestion,
        answer: message.content,
        sources: message.sources ?? []
      });
      pendingQuestion = "";
    }
  }

  return rounds.slice(-limit);
}

export function truncateText(value: unknown, maxLength: number) {
  const text = cleanPptText(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export function cleanPptText(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return "";
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-zA-Z]*|```/g, ""))
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*•]\s*/gm, "- ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/([\u4e00-\u9fff])\s+([，。！？；：、）】])/g, "$1$2")
    .replace(/([（【])\s+/g, "$1")
    .replace(/\s+([）】])/g, "$1")
    .trim();
}

function compactParagraphs(value: unknown, maxParagraphs: number, maxLength: number) {
  const text = cleanPptText(value);
  if (!text) return "";
  const sliced = truncateText(text, maxLength);
  const paragraphs = sliced
    .split(/\n{1,2}/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, maxParagraphs);
  return paragraphs.length ? paragraphs.join("\n\n") : sliced;
}

function cleanAnswerForQa(value: unknown) {
  const text = cleanPptText(value);
  if (!text) return "";
  const sourceSplit = text.split(/(?:^|\n)\s*(?:来源|引用来源|Sources?|Source)\s*[:：]/i)[0];
  return sourceSplit
    .replace(/(?:^|\n)\s*[-*]?\s*(?:第\s*\d+\s*(?:段|页)|Source\s*\d*)[:：][^\n]{0,260}/gi, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

