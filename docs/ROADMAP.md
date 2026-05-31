# DocuMuse Roadmap

## Phase 1：真实 PDF 上传与文本解析

- 支持本地选择 PDF 文件。
- 接入 PDF 文本提取库。
- 输出页码、段落和章节结构。
- 建立解析失败与重试机制。

## Phase 2：接入 OpenAI-compatible LLM

- 接入 OpenAI / OpenAI Compatible / DeepSeek / Gemini / Anthropic / Ollama。
- 使用 API 设置中的 Provider、Base URL、Model 和 Temperature。
- 支持摘要、翻译和分段分析的真实生成。
- Phase 2A 已加入服务端 `.env.local` 配置的基础文档分析接口。

## Phase 3：文档问答 / RAG

- 将文档切分为可检索片段。
- 建立向量索引或轻量检索层。
- 聊天回复附带引用来源。
- 支持多轮上下文。

## Phase 4：真实 Markdown / PPT 导出

- 导出摘要、翻译、分段分析和引用为 Markdown。
- 生成 PPT 大纲。
- 支持导出可编辑 PPTX。

## Phase 5：音频生成

- 根据文档生成播客脚本和朗读稿。
- 接入 TTS。
- 支持音频预览和下载。

## Phase 6：图片生成

- 从图谱节点和创意输出生成图片提示词。
- 接入图片生成模型。
- 支持封面图、信息图和社交媒体配图。

## Phase 7：EPUB / Word 支持

- 支持 EPUB 章节解析。
- 支持 DOCX 文本和标题结构解析。
- 统一不同文档类型的结构化数据模型。

## Phase 8：桌面版 Tauri / Electron

- 封装为桌面应用。
- 支持本地文件管理。
- 支持本地模型和本地缓存。
- 优化隐私和离线使用体验。
