"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

const providers = [
  { label: "OpenAI", value: "openai" },
  { label: "OpenAI Compatible", value: "openai-compatible" },
  { label: "MiniMax Token Plan", value: "minimax-token-plan" },
  { label: "DeepSeek", value: "deepseek" },
  { label: "Gemini", value: "gemini" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Ollama / Local", value: "ollama" }
];

const minimaxModels = [
  "MiniMax-M2.7",
  "MiniMax-M2.7-highspeed",
  "MiniMax-M2.5",
  "MiniMax-M2.5-highspeed",
  "MiniMax-M2.1",
  "MiniMax-M2.1-highspeed",
  "MiniMax-M2"
];

type PublicLlmConfig = {
  provider: string;
  hasApiKey: boolean;
  maskedApiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  source: "ui" | "env" | "default";
};

type ApiSettings = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
};

const defaultSettings: ApiSettings = {
  provider: "openai-compatible",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  temperature: 0.2
};

async function parseJson<T>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("接口返回了非 JSON 响应。");
  }
  return (await response.json()) as T;
}

function sourceLabel(source?: PublicLlmConfig["source"]) {
  if (source === "ui") return "UI 本地配置";
  if (source === "env") return ".env.local";
  return "默认值";
}

export function ApiSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<ApiSettings>(defaultSettings);
  const [publicConfig, setPublicConfig] = useState<PublicLlmConfig | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "testing" | "clearing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const isMiniMax = settings.provider === "minimax-token-plan";

  const modelOptions = useMemo(() => {
    if (isMiniMax) return minimaxModels;
    return [settings.model || defaultSettings.model];
  }, [isMiniMax, settings.model]);

  const loadSettings = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/settings/llm", { cache: "no-store" });
      const payload = await parseJson<{ ok: boolean; config?: PublicLlmConfig; error?: string }>(response);
      if (!response.ok || !payload.ok || !payload.config) {
        throw new Error(payload.error || "读取 LLM 设置失败。");
      }
      setPublicConfig(payload.config);
      setSettings({
        provider: payload.config.provider,
        apiKey: "",
        baseUrl: payload.config.baseUrl,
        model: payload.config.model,
        temperature: payload.config.temperature
      });
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "读取 LLM 设置失败。");
    }
  };

  useEffect(() => {
    if (open) {
      void loadSettings();
    }
  }, [open]);

  if (!open) return null;

  const update = (key: keyof ApiSettings, value: string | number) => {
    setSettings((current) => {
      if (key === "provider" && value === "minimax-token-plan") {
        return {
          ...current,
          provider: "minimax-token-plan",
          baseUrl: "https://api.minimaxi.com/v1",
          model: "MiniMax-M2.7",
          temperature: 1.0
        };
      }
      return { ...current, [key]: value };
    });
  };

  const save = async () => {
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const payload = await parseJson<{ ok: boolean; config?: PublicLlmConfig; error?: string }>(response);
      if (!response.ok || !payload.ok || !payload.config) {
        throw new Error(payload.error || "保存 LLM 设置失败。");
      }
      setPublicConfig(payload.config);
      setSettings((current) => ({ ...current, apiKey: "" }));
      setStatus("success");
      setMessage("设置已保存。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "保存 LLM 设置失败。");
    }
  };

  const testConnection = async () => {
    setStatus("testing");
    setMessage("");
    try {
      const response = await fetch("/api/llm/test", { method: "POST" });
      const payload = await parseJson<{ ok: boolean; model?: string; message?: string; error?: string }>(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "连接测试失败。");
      }
      setStatus("success");
      setMessage(`${payload.message || "连接成功"}：${payload.model || settings.model}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "连接测试失败。");
    }
  };

  const clearApiKey = async () => {
    setStatus("clearing");
    setMessage("");
    try {
      const response = await fetch("/api/settings/llm/key", { method: "DELETE" });
      const payload = await parseJson<{ ok: boolean; config?: PublicLlmConfig; error?: string }>(response);
      if (!response.ok || !payload.ok || !payload.config) {
        throw new Error(payload.error || "清除 API Key 失败。");
      }
      setPublicConfig(payload.config);
      setSettings((current) => ({ ...current, apiKey: "" }));
      setStatus("success");
      setMessage("API Key 已清除。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "清除 API Key 失败。");
    }
  };

  const busy = status === "loading" || status === "saving" || status === "testing" || status === "clearing";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">API 设置</h2>
            <p className="mt-1 text-sm text-slate-500">配置保存在本机服务端文件中，不写入浏览器 localStorage。</p>
          </div>
          <button aria-label="关闭" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 px-6 py-5">
          {publicConfig && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <div>配置来源：{sourceLabel(publicConfig.source)}</div>
              <div className="mt-1">API Key：{publicConfig.hasApiKey ? publicConfig.maskedApiKey : "未设置"}</div>
            </div>
          )}
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Provider
            <select
              value={settings.provider}
              onChange={(event) => update("provider", event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
            >
              {providers.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>
          {isMiniMax && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-700">
              <p>MiniMax Token Plan Key 用于 Token Plan 额度和积分，和按量计费 API Key 不互通。请在 MiniMax 订阅管理 &gt; Token Plan 中获取。</p>
              <p className="mt-1">当前通过 MiniMax OpenAI-compatible 接口调用语言模型。</p>
            </div>
          )}
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            API Key
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) => update("apiKey", event.target.value)}
              placeholder={publicConfig?.hasApiKey ? `已设置：${publicConfig.maskedApiKey}；留空则不修改` : "请输入 API Key"}
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Base URL
            <input
              value={settings.baseUrl}
              onChange={(event) => update("baseUrl", event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Model
              {isMiniMax ? (
                <select
                  value={settings.model}
                  onChange={(event) => update("model", event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                >
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={settings.model}
                  onChange={(event) => update("model", event.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                />
              )}
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Temperature
              <input
                type="number"
                min={isMiniMax ? "0.1" : "0"}
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(event) => update("temperature", Number(event.target.value))}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          {status !== "idle" && (
            <div className={`rounded-lg px-3 py-2 text-sm ${status === "success" ? "bg-emerald-50 text-emerald-700" : status === "error" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
              {busy && (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {status === "loading" ? "正在读取设置..." : status === "saving" ? "正在保存设置..." : status === "testing" ? "正在测试连接..." : "正在清除 API Key..."}
                </span>
              )}
              {!busy && message}
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={() => void clearApiKey()} disabled={busy || !publicConfig?.hasApiKey} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
            清除 API Key
          </button>
          <button onClick={() => void testConnection()} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
            测试连接
          </button>
          <button onClick={() => void save()} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
