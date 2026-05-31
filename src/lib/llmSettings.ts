import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type LlmProvider = "openai" | "openai-compatible" | "deepseek" | "gemini" | "anthropic" | "ollama" | "minimax-token-plan";

export type StoredLlmConfig = {
  provider: LlmProvider;
  apiKey?: string;
  baseUrl: string;
  model: string;
  temperature: number;
  updatedAt: string;
};

export type ResolvedLlmConfig = {
  provider: LlmProvider;
  apiKey?: string;
  baseUrl: string;
  model: string;
  temperature: number;
  source: "ui" | "env" | "default";
};

export type PublicLlmConfig = Omit<ResolvedLlmConfig, "apiKey"> & {
  hasApiKey: boolean;
  maskedApiKey: string;
};

const defaultConfig = {
  provider: "openai-compatible" as LlmProvider,
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  temperature: 0.2
};

const settingsDir = path.join(process.cwd(), "data", "settings");
const settingsPath = path.join(settingsDir, "llm-config.json");

function normalizeProvider(provider: unknown): LlmProvider {
  const value = typeof provider === "string" ? provider.toLowerCase() : "";
  if (["openai", "openai-compatible", "deepseek", "gemini", "anthropic", "ollama", "minimax-token-plan"].includes(value)) {
    return value as LlmProvider;
  }
  return "openai-compatible";
}

function normalizeTemperature(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return defaultConfig.temperature;
  return Math.min(2, Math.max(0, numberValue));
}

function normalizeProviderTemperature(provider: LlmProvider, value: unknown) {
  const temperature = normalizeTemperature(value);
  if (provider === "minimax-token-plan" && temperature <= 0) {
    return 1.0;
  }
  return temperature;
}

export function maskApiKey(apiKey?: string) {
  if (!apiKey) return "";
  const prefix = apiKey.startsWith("sk-") ? "sk-" : apiKey.slice(0, Math.min(4, apiKey.length));
  const suffix = apiKey.slice(-4);
  return `${prefix}****${suffix}`;
}

async function ensureSettingsDir() {
  await mkdir(settingsDir, { recursive: true });
}

export async function readStoredLlmConfig(): Promise<StoredLlmConfig | null> {
  try {
    const raw = await readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredLlmConfig>;
    return {
      provider: normalizeProvider(parsed.provider),
      apiKey: typeof parsed.apiKey === "string" && parsed.apiKey.trim() ? parsed.apiKey.trim() : undefined,
      baseUrl: typeof parsed.baseUrl === "string" && parsed.baseUrl.trim() ? parsed.baseUrl.trim() : defaultConfig.baseUrl,
      model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model.trim() : defaultConfig.model,
      temperature: normalizeProviderTemperature(normalizeProvider(parsed.provider), parsed.temperature),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString()
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function saveLlmConfig(input: Partial<StoredLlmConfig>) {
  await ensureSettingsDir();
  const current = await readStoredLlmConfig();
  const next: StoredLlmConfig = {
    provider: normalizeProvider(input.provider ?? current?.provider),
    apiKey: typeof input.apiKey === "string" && input.apiKey.trim() ? input.apiKey.trim() : current?.apiKey,
    baseUrl: typeof input.baseUrl === "string" && input.baseUrl.trim() ? input.baseUrl.trim() : current?.baseUrl || defaultConfig.baseUrl,
    model: typeof input.model === "string" && input.model.trim() ? input.model.trim() : current?.model || defaultConfig.model,
    temperature: normalizeProviderTemperature(normalizeProvider(input.provider ?? current?.provider), input.temperature ?? current?.temperature),
    updatedAt: new Date().toISOString()
  };
  await writeFile(settingsPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function clearStoredApiKey() {
  const current = await readStoredLlmConfig();
  if (!current) {
    await ensureSettingsDir();
    const next = { ...defaultConfig, updatedAt: new Date().toISOString() };
    await writeFile(settingsPath, JSON.stringify(next, null, 2), "utf8");
    return next;
  }
  const { apiKey: _apiKey, ...rest } = current;
  const next = { ...rest, updatedAt: new Date().toISOString() };
  await ensureSettingsDir();
  await writeFile(settingsPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function deleteStoredLlmConfig() {
  await rm(settingsPath, { force: true });
}

export async function resolveLlmConfig(): Promise<ResolvedLlmConfig> {
  const stored = await readStoredLlmConfig();
  const envApiKey = process.env.OPENAI_API_KEY?.trim();
  const hasUiConfig = Boolean(stored);
  const hasUiApiKey = Boolean(stored?.apiKey);

  return {
    provider: stored?.provider ?? defaultConfig.provider,
    apiKey: stored?.apiKey || envApiKey || undefined,
    baseUrl: stored?.baseUrl || process.env.OPENAI_BASE_URL || defaultConfig.baseUrl,
    model: stored?.model || process.env.OPENAI_MODEL || defaultConfig.model,
    temperature: stored?.temperature ?? defaultConfig.temperature,
    source: hasUiApiKey ? "ui" : envApiKey ? "env" : hasUiConfig ? "ui" : "default"
  };
}

export async function getPublicLlmConfig(): Promise<PublicLlmConfig> {
  const resolved = await resolveLlmConfig();
  return {
    provider: resolved.provider,
    baseUrl: resolved.baseUrl,
    model: resolved.model,
    temperature: resolved.temperature,
    source: resolved.source,
    hasApiKey: Boolean(resolved.apiKey),
    maskedApiKey: maskApiKey(resolved.apiKey)
  };
}
