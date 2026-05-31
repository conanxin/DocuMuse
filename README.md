# DocuMuse

DocuMuse 是一个开源的 AI 文档阅读工作台。用户可以上传 PDF、电子书或文档，系统将文档解析成一个可交互的阅读工作台，支持摘要、翻译、分段分析、图谱、创意输出和与文档对话等能力。

当前版本已包含本地 PDF 上传、文本解析、本地文档库和 OpenAI-compatible LLM 基础分析。数据库、认证、RAG 和多模态生成仍未实现。

## 当前 UI Demo 功能

- 首页上传页：最近文档、拖拽上传框、上传状态模拟、快速模板、工作流条。
- 上传流程：empty、dragging、uploading、extracting、analyzing、done、error。
- 本地 PDF 上传：上传普通可复制文本 PDF 后，文件保存到 `data/uploads/`，解析 JSON 保存到 `data/documents/`。
- 本地文档库：首页最近文档优先读取真实本地文档，支持再次打开和删除。
- LLM 基础分析：配置 `.env.local` 后，可在真实文档工作台点击“开始分析”生成结构化摘要、翻译、分段分析和创意输出。
- 文档工作台：总览、原文、翻译、分段分析、图谱、创意输出。
- 文档问答：快捷问题、mock 聊天记录、发送问题后生成 mock 回复和引用来源。
- API 设置弹窗：Provider、API Key、Base URL、Model、Temperature、测试连接、保存到服务端本地配置文件。

## 如何安装

```bash
npm install
```

## 如何运行

```bash
npm run dev
```

打开浏览器访问：

```text
http://localhost:3000
```

文档工作台 Demo 地址：

```text
http://localhost:3000/documents/demo
```

## LLM 配置

创建 `.env.local`：

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_BASE_URL` 支持 OpenAI-compatible Chat Completions endpoint。当前版本只使用服务端环境变量，不会把完整 API Key 暴露到前端。

也可以在应用内点击“API 设置”保存本地配置。UI 保存的配置位于 `data/settings/llm-config.json`，优先级高于 `.env.local`，并且不会把完整 API Key 返回给前端。

MiniMax Token Plan 用户可以在 Provider 中选择 `MiniMax Token Plan`。推荐配置：

```text
Base URL: https://api.minimaxi.com/v1
Model: MiniMax-M2.7
Temperature: 1.0
```

MiniMax Token Plan Key 与按量计费 API Key 不互通。

注意：当前 UI 保存 Key 的方式适合本地运行。如果公开部署，需要增加用户系统、加密存储和更严格的权限隔离。

## 当前限制

- 仅支持本地 PDF 上传和可复制文本提取。
- 不支持扫描版 PDF OCR。
- 不实现 EPUB / Word 解析。
- 不实现云存储。
- 不接数据库。
- 不接认证系统。
- 仅在配置 `OPENAI_API_KEY` 后调用 OpenAI-compatible Chat Completions API。
- 未配置 `OPENAI_API_KEY` 时不会调用 LLM，并会返回清晰 JSON 错误。
- 不生成真实音频、PPT 或图片。
- 翻译、图谱、创意输出和文档问答仍为 mock / 占位内容。

## 下一阶段计划

下一阶段建议进入 Phase 2B：把文档问答升级为真实 LLM 对话，并开始设计轻量检索 / RAG。

## License

MIT License. See [LICENSE](./LICENSE).
