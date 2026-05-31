"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const providers = ["OpenAI", "OpenAI Compatible", "DeepSeek", "Gemini", "Anthropic", "Ollama / Local"];

type ApiSettings = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
};

const defaultSettings: ApiSettings = {
  provider: "OpenAI Compatible",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  temperature: 0.7
};

export function ApiSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<ApiSettings>(defaultSettings);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const raw = window.localStorage.getItem("documuse-api-settings");
    if (raw) {
      setSettings(JSON.parse(raw));
    }
  }, [open]);

  if (!open) return null;

  const update = (key: keyof ApiSettings, value: string | number) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const testConnection = () => {
    setTestStatus("testing");
    window.setTimeout(() => {
      setTestStatus(settings.apiKey.trim() ? "success" : "error");
    }, 700);
  };

  const save = () => {
    window.localStorage.setItem("documuse-api-settings", JSON.stringify(settings));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">API 设置</h2>
            <p className="mt-1 text-sm text-slate-500">Demo 仅保存到本地浏览器，不会发起真实请求。</p>
          </div>
          <button aria-label="关闭" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 px-6 py-5">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Provider
            <select
              value={settings.provider}
              onChange={(event) => update("provider", event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
            >
              {providers.map((provider) => (
                <option key={provider}>{provider}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            API Key
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) => update("apiKey", event.target.value)}
              placeholder="sk-..."
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
              <input
                value={settings.model}
                onChange={(event) => update("model", event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Temperature
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(event) => update("temperature", Number(event.target.value))}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          {testStatus !== "idle" && (
            <div className={`rounded-lg px-3 py-2 text-sm ${testStatus === "success" ? "bg-emerald-50 text-emerald-700" : testStatus === "error" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
              {testStatus === "testing" && "正在测试连接..."}
              {testStatus === "success" && "连接测试成功。"}
              {testStatus === "error" && "连接测试失败：请填写 API Key。"}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={testConnection} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            测试连接
          </button>
          <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
