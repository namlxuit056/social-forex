import OpenAI from "openai";

type AiProvider = "deepseek" | "groq" | "openai";

type ProviderConfig = {
  baseURL: string;
  model: string;
  envKey: string;
  /** DeepSeek-R1 rejects temperature param — must be omitted */
  supportsTemperature: boolean;
  maxTokens: number;
};

const PROVIDER_CONFIG: Record<AiProvider, ProviderConfig> = {
  deepseek: {
    baseURL: "https://api.deepseek.com",
    model: "deepseek-v4-pro",
    envKey: "DEEPSEEK_API_KEY",
    supportsTemperature: true,
    maxTokens: 8000,
  },
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
    supportsTemperature: true,
    maxTokens: 900,
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    supportsTemperature: true,
    maxTokens: 900,
  },
};

export type ResolvedAiProvider = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseURL: string;
  supportsTemperature: boolean;
  maxTokens: number;
};

export function resolveAiProvider(): ResolvedAiProvider | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase() as AiProvider;

  if (explicit && PROVIDER_CONFIG[explicit]) {
    const config = PROVIDER_CONFIG[explicit];
    const key = process.env[config.envKey]?.trim();
    if (key) return { provider: explicit, apiKey: key, ...config };
  }

  // Priority: deepseek (R1 reasoning) → groq (fast/free) → openai
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    return { provider: "deepseek", apiKey: deepseekKey, ...PROVIDER_CONFIG.deepseek };
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    return { provider: "groq", apiKey: groqKey, ...PROVIDER_CONFIG.groq };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    return { provider: "openai", apiKey: openAiKey, ...PROVIDER_CONFIG.openai };
  }

  return null;
}

export function createAiClient(config: { apiKey: string; baseURL: string }) {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}
