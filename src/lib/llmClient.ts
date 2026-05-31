import { resolveLlmConfig, type ResolvedLlmConfig } from "./llmSettings";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionOptions = {
  messages: readonly ChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

type ChatCompletionPayload = {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
};

export class LlmConfigError extends Error {}
export class LlmResponseError extends Error {}

function getShortDetail(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}

export function stripReasoningContent(content: string) {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractJsonObject(content: string) {
  const withoutReasoning = stripReasoningContent(content);
  if (withoutReasoning.startsWith("{") && withoutReasoning.endsWith("}")) return withoutReasoning;

  const fenced = withoutReasoning.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const fencedContent = fenced[1].trim();
    if (fencedContent.startsWith("{") && fencedContent.endsWith("}")) return fencedContent;
  }

  const match = withoutReasoning.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new LlmResponseError("模型没有返回 JSON 对象。");
  }
  return match[0];
}

function normalizeTemperature(config: ResolvedLlmConfig, requested?: number) {
  const temperature = requested ?? config.temperature;
  if (config.provider === "minimax-token-plan" && temperature <= 0) {
    // MiniMax Token Plan models do not accept 0 temperature; keep calls valid while staying deterministic-ish.
    return 1.0;
  }
  return temperature;
}

function buildRequestBody(config: ResolvedLlmConfig, options: ChatCompletionOptions, expectsJson: boolean) {
  const baseBody = {
    model: config.model,
    messages: options.messages,
    temperature: normalizeTemperature(config, options.temperature)
  };

  if (config.provider === "minimax-token-plan") {
    return {
      ...baseBody,
      max_completion_tokens: options.maxTokens ?? 4000
    };
  }

  return {
    ...baseBody,
    max_tokens: options.maxTokens ?? 4000,
    ...(expectsJson ? { response_format: { type: "json_object" } } : {})
  };
}

function mapProviderError(status: number, raw: string, provider: ResolvedLlmConfig["provider"]) {
  if (provider === "minimax-token-plan") {
    if (status === 401 || status === 403) return "MiniMax Token Plan Key 无效或没有权限。";
    if (status === 402) return "MiniMax Token Plan 没有可用资源或额度不足。";
    if (status === 404) return "MiniMax Base URL 或模型名错误。";
    if (status === 429) return "MiniMax 额度或频率限制，请稍后重试。";
    if (status >= 500) return "MiniMax 服务暂时不可用，请稍后重试。";
  }
  return `LLM 请求失败：HTTP ${status} ${raw.slice(0, 200)}`;
}

async function requestChatCompletion(options: ChatCompletionOptions, expectsJson: boolean) {
  const config = await resolveLlmConfig();
  if (!config.apiKey) {
    throw new LlmConfigError("缺少 API Key，请在 API 设置中保存密钥，或在 .env.local 中配置 OPENAI_API_KEY。");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildRequestBody(config, options, expectsJson)),
      signal: controller.signal
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new LlmResponseError(mapProviderError(response.status, raw, config.provider));
    }

    let payload: ChatCompletionPayload;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new LlmResponseError(`LLM 响应不是合法 JSON：${getShortDetail(error)}`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new LlmResponseError("LLM 响应中没有 message content。");
    }

    return {
      content,
      model: payload.model || config.model,
      provider: config.provider
    };
  } catch (error) {
    if (error instanceof LlmConfigError || error instanceof LlmResponseError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmResponseError("LLM 请求超时，请稍后重试。");
    }
    throw new LlmResponseError(`LLM 请求失败：${getShortDetail(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function chatCompletionText(options: ChatCompletionOptions) {
  const result = await requestChatCompletion(options, false);
  const text = stripReasoningContent(result.content);
  if (!text) {
    throw new LlmResponseError("模型返回为空，请检查模型名或服务状态。");
  }

  return {
    text,
    model: result.model,
    provider: result.provider
  };
}

export async function chatCompletionJson<T>(options: ChatCompletionOptions): Promise<{ data: T; model: string }> {
  const result = await requestChatCompletion(options, true);

  try {
    return {
      data: JSON.parse(extractJsonObject(result.content)) as T,
      model: result.model
    };
  } catch (error) {
    if (error instanceof LlmResponseError) throw error;
    throw new LlmResponseError(`模型返回的 JSON 无法解析：${getShortDetail(error)}`);
  }
}

export const createJsonChatCompletion = chatCompletionJson;

export async function testLlmConnection() {
  const result = await chatCompletionText({
    messages: [
      { role: "system", content: "You are a connection test endpoint. Reply with plain text only." },
      { role: "user", content: "Reply with OK only." }
    ],
    maxTokens: 32,
    temperature: 0
  });

  return {
    model: result.model,
    provider: result.provider,
    message: "连接成功"
  };
}

export function toPublicLlmError(error: unknown) {
  if (error instanceof LlmConfigError) {
    return { message: error.message, status: 400 };
  }
  if (error instanceof LlmResponseError) {
    return { message: error.message, status: 502 };
  }
  return { message: "LLM 调用失败。", status: 500 };
}
