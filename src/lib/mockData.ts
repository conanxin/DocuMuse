export type DocumentStatus = "已解析" | "解析中" | "失败";

export const mockDocuments = [
  { id: "1", name: "百年孤独.pdf", type: "PDF", uploadedAt: "今天 09:42", status: "已解析" as DocumentStatus },
  { id: "2", name: "AI 发展简史.epub", type: "EPUB", uploadedAt: "昨天 18:20", status: "解析中" as DocumentStatus },
  { id: "3", name: "麦肯锡年度报告 2024.pdf", type: "PDF", uploadedAt: "5 月 28 日", status: "已解析" as DocumentStatus },
  { id: "4", name: "人类简史.docx", type: "DOCX", uploadedAt: "5 月 21 日", status: "失败" as DocumentStatus },
  { id: "5", name: "Deep Learning 综述.pdf", type: "PDF", uploadedAt: "5 月 18 日", status: "已解析" as DocumentStatus }
];

export const mockDocumentOutline = [
  "第 1 节：问题的提出",
  "第 2 节：核心观点",
  "第 3 节：案例与论证",
  "第 4 节：结论与启发"
];

export const mockOverview = {
  oneLineSummary: "这份访谈材料围绕 AI 如何改变知识工作展开，强调工具、判断力与组织流程之间的协同关系。",
  keyPoints: [
    "AI 的价值不只是提速，更在于改变信息整理和决策的工作流。",
    "高质量输入、清晰上下文和可追溯来源是可靠 AI 输出的前提。",
    "组织需要建立人机协同规范，而不是把 AI 当作单点工具。",
    "文档工作台应把阅读、提问、生成与导出放在同一上下文中。"
  ],
  keywords: ["AI 阅读", "知识工作", "文档解析", "RAG", "多模态生成"],
  docType: "访谈稿 / 研究材料",
  language: "中文",
  sectionSummaries: [
    { title: "问题的提出", summary: "说明知识工作中信息分散、重复整理和引用追踪困难的问题。" },
    { title: "核心观点", summary: "提出 AI 文档工作台应成为阅读、理解、生成的统一界面。" },
    { title: "案例与论证", summary: "通过研究报告、小说和论文等场景说明交互式阅读的价值。" },
    { title: "结论与启发", summary: "强调下一阶段应优先落地解析、问答和导出能力。" }
  ]
};

export const mockOriginalText = [
  "Page 1. The interview begins with a practical question: why do knowledge workers still spend so much time moving content between reading tools, notes, slides, and chat interfaces?",
  "Page 2. The respondent argues that AI should not be treated as a detached assistant. It should be embedded into the document surface, where every summary, quote, and generated output can be traced back to its source.",
  "Page 3. In the proposed workflow, users upload a document, receive a structured workspace, inspect the original text, compare translations, open section-level analysis, and ask grounded questions.",
  "Page 4. The conversation concludes that the strongest products will combine reliable parsing, transparent citations, and creative generation without hiding the source material."
];

export const mockTranslation = [
  "第 1 页。访谈从一个实际问题开始：为什么知识工作者仍然要在阅读工具、笔记、幻灯片和聊天界面之间反复搬运内容？",
  "第 2 页。受访者认为，AI 不应被当作一个脱离文档的助手。它应该嵌入文档界面，让每个摘要、引用和生成内容都能追溯到来源。",
  "第 3 页。在设想的流程中，用户上传文档后会得到结构化工作台，可以查看原文、对照翻译、打开分段分析，并提出有来源的问题。",
  "第 4 页。对话最后指出，最强的产品会结合可靠解析、透明引用和创意生成，同时不遮蔽原始材料。"
];

export const mockSectionAnalysis = [
  {
    section: "第 1 节：问题的提出",
    summary: "知识工作中的主要摩擦来自工具割裂和上下文反复搬运。",
    points: ["阅读和输出常常分离", "引用来源容易丢失", "重复整理降低思考质量"],
    quote: "knowledge workers still spend so much time moving content between reading tools",
    page: "第 1 页"
  },
  {
    section: "第 2 节：核心观点",
    summary: "AI 应嵌入文档表面，并让生成内容保持可追溯。",
    points: ["摘要需要来源", "引用需要定位", "生成内容需要上下文"],
    quote: "every summary, quote, and generated output can be traced back to its source",
    page: "第 2 页"
  },
  {
    section: "第 3 节：案例与论证",
    summary: "结构化工作台把原文、翻译、分析和问答统一到同一流程。",
    points: ["上传后生成工作台", "多视图阅读", "问答引用文档段落"],
    quote: "receive a structured workspace",
    page: "第 3 页"
  },
  {
    section: "第 4 节：结论与启发",
    summary: "产品竞争力来自可靠解析、透明引用和创意生成的组合。",
    points: ["解析质量是基础", "引用建立信任", "创意输出扩展文档价值"],
    quote: "reliable parsing, transparent citations, and creative generation",
    page: "第 4 页"
  }
];

export const mockGraphData = [
  {
    id: "center",
    label: "AI 文档阅读工作台",
    type: "中心主题",
    summary: "把文档解析、阅读理解、引用追踪和创意输出整合在一个工作台中。",
    source: "第 2 页 / 第 3 段",
    related: "核心观点、工作流、产品边界",
    prompt: "A clean SaaS dashboard showing an AI document workspace with connected insight nodes, white and blue style"
  },
  {
    id: "themes",
    label: "主题分支",
    type: "主题",
    summary: "围绕知识工作流、可追溯生成和多模态输出展开。",
    source: "第 1 页 / 第 2 段",
    related: "阅读、摘要、问答、导出",
    prompt: "An abstract knowledge workflow map with blue branches and document cards"
  },
  {
    id: "entities",
    label: "人物 / 实体分支",
    type: "实体",
    summary: "涉及知识工作者、受访者、AI 助手和组织团队等角色。",
    source: "第 2 页 / 第 1 段",
    related: "用户、组织、模型、文档",
    prompt: "A relationship map of people and AI systems collaborating over documents"
  },
  {
    id: "events",
    label: "事件分支",
    type: "事件",
    summary: "上传文档、生成工作台、提问、导出结果构成核心事件链。",
    source: "第 3 页 / 第 1 段",
    related: "上传、解析、分析、生成",
    prompt: "A timeline of document upload, parsing, analysis, and export in a modern interface"
  },
  {
    id: "timeline",
    label: "时间线分支",
    type: "时间线",
    summary: "从阅读痛点开始，经过工作台生成，最终进入可复用输出。",
    source: "第 4 页 / 第 2 段",
    related: "痛点、方案、结论",
    prompt: "A horizontal timeline for an AI document reading product roadmap"
  }
];

export type CreativeStatus = "未生成" | "生成中" | "已生成" | "生成失败";

export const mockCreativeOutputs = [
  { id: "translation", title: "中文翻译", status: "已生成" as CreativeStatus, preview: "完整中文译文已准备，可用于对照阅读。" },
  { id: "ppt", title: "PPT 大纲", status: "未生成" as CreativeStatus, preview: "适合生成 8 页产品演示结构。" },
  { id: "podcast", title: "播客脚本", status: "已生成" as CreativeStatus, preview: "双人对谈脚本，时长约 6 分钟。" },
  { id: "audio", title: "音频脚本", status: "未生成" as CreativeStatus, preview: "适合朗读的精简讲稿。" },
  { id: "image", title: "图片提示词", status: "生成失败" as CreativeStatus, preview: "可重新生成信息图和封面提示词。" },
  { id: "social", title: "社交媒体总结", status: "已生成" as CreativeStatus, preview: "适合发布到 X、微信公众号和 LinkedIn。" }
];

export const mockChatMessages = [
  {
    role: "assistant" as const,
    content: "我已经读取了 demo-interview.pdf。你可以问我摘要、核心观点、引用句子或让它生成中文总结。",
    source: "来源：第 1 页 / 第 1 段"
  },
  {
    role: "user" as const,
    content: "这篇文章最重要的观点是什么？"
  },
  {
    role: "assistant" as const,
    content: "最重要的观点是：AI 文档工具需要嵌入阅读现场，并且所有输出都应能追溯到原文来源。",
    source: "来源：第 2 页 / 第 3 段"
  }
];
