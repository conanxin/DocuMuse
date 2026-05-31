# DocuMuse

DocuMuse 是一个开源的 AI 文档阅读工作台。用户可以上传 PDF、电子书或文档，系统将文档解析成一个可交互的阅读工作台，支持摘要、翻译、分段分析、图谱、创意输出和与文档对话等能力。

当前版本是第一版 UI Demo，只实现前端界面、组件结构和 mock 交互，不包含真实后端、真实 PDF 解析或真实 LLM 调用。

## 当前 UI Demo 功能

- 首页上传页：最近文档、拖拽上传框、上传状态模拟、快速模板、工作流条。
- 上传流程：empty、dragging、uploading、extracting、analyzing、done、error。
- 本地 PDF 上传：上传普通可复制文本 PDF 后，文件保存到 `data/uploads/`，解析 JSON 保存到 `data/documents/`。
- 本地文档库：首页最近文档优先读取真实本地文档，支持再次打开和删除。
- 文档工作台：总览、原文、翻译、分段分析、图谱、创意输出。
- 文档问答：快捷问题、mock 聊天记录、发送问题后生成 mock 回复和引用来源。
- API 设置弹窗：Provider、API Key、Base URL、Model、Temperature、测试连接、保存到 localStorage。

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

## 当前限制

- 仅支持本地 PDF 上传和可复制文本提取。
- 不支持扫描版 PDF OCR。
- 不实现 EPUB / Word 解析。
- 不实现云存储。
- 不接数据库。
- 不接认证系统。
- 不调用真实 LLM API。
- 不生成真实音频、PPT 或图片。
- 所有内容均来自 `src/lib/mockData.ts`。
- 翻译、图谱、创意输出和文档问答仍为 mock / 占位内容。

## 下一阶段计划

下一阶段建议优先实现真实 PDF 上传与文本解析，然后接入 OpenAI-compatible LLM，逐步加入文档问答、Markdown / PPT 导出、音频生成、图片生成和桌面版能力。

## License

MIT License. See [LICENSE](./LICENSE).
