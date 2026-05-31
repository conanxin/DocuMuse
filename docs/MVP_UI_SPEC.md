# DocuMuse MVP UI Spec

## 产品目标

DocuMuse 第一版 MVP UI 的目标是搭建一个可本地运行的 AI 文档阅读工作台 Demo，用于验证核心用户流程和界面结构：

上传文档 -> 模拟解析状态 -> 进入文档工作台 -> 查看摘要 / 原文 / 翻译 / 分段分析 / 图谱 / 创意输出 / 文档问答。

本版本只做 UI 和前端状态，不实现真实上传、解析、LLM、数据库、认证或云存储。

## 页面结构

### 首页 / 上传页

路径：`/`

页面包含：

- 顶部导航栏：DocuMuse Logo、最近文档、模板、API 设置、搜索、通知、用户头像占位。
- 左侧最近文档：展示 5 个 mock 文档，包含文件类型、上传时间和解析状态。
- 中央上传区域：大型拖拽上传框、选择文件按钮、解析说明文案。
- 上传状态：empty、dragging、uploading、extracting、analyzing、done、error。
- 右侧快速模板：采访稿分析、小说角色关系、论文解读、播客脚本生成。
- 底部工作流条：上传、解析、生成工作台。

### 文档工作台页

路径：`/documents/demo`

采用三栏布局：

- 左侧栏：功能导航和文档大纲。
- 中间主内容区：根据功能导航切换不同面板。
- 右侧栏：与文档对话。

顶部操作栏展示：

- 文档名：demo-interview.pdf
- 状态：已解析
- 开始分析
- 重新生成
- 导出 Markdown
- API 设置

## 用户流程

1. 用户进入首页。
2. 用户点击“选择文件”或拖拽文件到上传框。
3. 前端模拟进入 uploading 状态并展示进度条。
4. 状态依次进入 extracting、analyzing、done。
5. done 状态下显示“进入文档工作台”按钮。
6. 用户进入 `/documents/demo`。
7. 用户在左侧切换总览、原文、翻译、分段分析、图谱、创意输出。
8. 用户可在右侧聊天栏点击快捷问题或输入问题。
9. 系统追加 mock 回复并展示引用来源。
10. 用户可打开 API 设置弹窗并保存本地配置。

## 组件结构

- `AppHeader`：应用顶部导航栏。
- `UploadDropzone`：上传拖拽区和上传状态机。
- `RecentDocuments`：最近文档列表。
- `TemplateCards`：快速模板卡片。
- `WorkflowSteps`：上传、解析、生成工作台流程条。
- `ApiSettingsDialog`：API 设置弹窗。
- `DocumentWorkspace`：文档工作台总容器。
- `WorkspaceSidebar`：工作台左侧导航和大纲。
- `WorkspaceTopbar`：工作台顶部操作栏。
- `OverviewPanel`：总览面板。
- `OriginalTextPanel`：原文面板。
- `TranslationPanel`：翻译面板。
- `SectionAnalysisPanel`：分段分析面板。
- `GraphPanel`：简化图谱面板和节点详情。
- `CreativeOutputsPanel`：创意输出面板。
- `ChatPanel`：文档问答栏。
- `StatusBadge`：状态标签。
- `OutputCard`：创意输出卡片。

## Mock 功能范围

Mock 数据集中在 `src/lib/mockData.ts`：

- `mockDocuments`
- `mockDocumentOutline`
- `mockOverview`
- `mockOriginalText`
- `mockTranslation`
- `mockSectionAnalysis`
- `mockGraphData`
- `mockCreativeOutputs`
- `mockChatMessages`

Mock 交互包括：

- 上传流程状态切换和进度条。
- 上传失败与重试。
- 图谱节点点击与详情切换。
- 创意输出重新生成 loading。
- 文档问答追加用户消息和 mock 回复。
- API 设置保存到 localStorage。
- API 测试连接 mock 成功 / 失败。
