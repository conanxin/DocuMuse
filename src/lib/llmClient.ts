type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionOptions = {
  messages: readonly ChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

export class LlmConfigError extends Error {}
export class LlmResponseError extends Error {}

function getLlmConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LlmConfigError("缺少 OPENAI_API_KEY，请在 .env.local 中配置服务端 API Key。");
  }

  return {
    apiKey,
    baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini"
  };
}

function getShortDetail(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new LlmResponseError("模型没有返回 JSON 对象。");
  }
  return match[0];
}

export async function createJsonChatCompletion<T>(options: ChatCompletionOptions): Promise<{ data: T; model: string }> {
  const config = getLlmConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 4000,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new LlmResponseError(`LLM 请求失败：HTTP ${response.status} ${raw.slice(0, 200)}`);
    }

    let payload: { choices?: Array<{ message?: { content?: string } }>; model?: string };
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new LlmResponseError(`LLM 响应不是合法 JSON：${getShortDetail(error)}`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new LlmResponseError("LLM 响应中没有 message content。");
    }

    try {
      return {
        data: JSON.parse(extractJsonObject(content)) as T,
        model: payload.model || config.model
      };
    } catch (error) {
      if (error instanceof LlmResponseError) throw error;
      throw new LlmResponseError(`模型返回的 JSON 无法解析：${getShortDetail(error)}`);
    }
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

export async function testLlmConnection() {
  return createJsonChatCompletion<{ message: string }>({
    messages: [
      { role: "system", content: "Return JSON only." },
      { role: "user", content: "Return {\"message\":\"连接成功\"}." }
    ],
    maxTokens: 40,
    temperature: 0
  });
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
