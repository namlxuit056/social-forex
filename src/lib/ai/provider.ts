import OpenAI from "openai";

type AiProvider = "deepseek" | "groq" | "openai";

type ProviderConfig = {
  baseURL: string;
  model: string;
  envKey: string;
  /** DeepSeek-R1 rejects temperature param — must be omitted */
  supportsTemperature: boolean;
  /** Some models (deepseek-v4-pro) return empty content when response_format is set */
  supportsJsonResponseFormat: boolean;
  maxTokens: number;
  /** Extra token budget for internal chain-of-thought in reasoning models (0 for non-reasoning) */
  reasoningOverhead: number;
};

const PROVIDER_CONFIG: Record<AiProvider, ProviderConfig> = {
  deepseek: {
    baseURL: "https://api.deepseek.com",
    model: "deepseek-v4-pro",
    envKey: "DEEPSEEK_API_KEY",
    supportsTemperature: true,
    supportsJsonResponseFormat: false,
    maxTokens: 8000,
    reasoningOverhead: 2500,
  },
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
    supportsTemperature: true,
    supportsJsonResponseFormat: true,
    maxTokens: 900,
    reasoningOverhead: 0,
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    supportsTemperature: true,
    supportsJsonResponseFormat: true,
    maxTokens: 900,
    reasoningOverhead: 0,
  },
};

export type ResolvedAiProvider = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseURL: string;
  supportsTemperature: boolean;
  supportsJsonResponseFormat: boolean;
  maxTokens: number;
  reasoningOverhead: number;
};

/** Returns the token budget needed: base output tokens + reasoning overhead for CoT models */
export function resolveMaxTokens(resolved: ResolvedAiProvider, base: number): number {
  return base + resolved.reasoningOverhead;
}

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
