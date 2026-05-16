import OpenAI from "openai";

type AiProvider = "groq" | "openai";

const PROVIDER_CONFIG: Record<
  AiProvider,
  { baseURL: string; model: string; envKey: string }
> = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
  },
};

export function resolveAiProvider():
  | { provider: AiProvider; apiKey: string; model: string; baseURL: string }
  | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase() as AiProvider;

  if (explicit && PROVIDER_CONFIG[explicit]) {
    const config = PROVIDER_CONFIG[explicit];
    const key = process.env[config.envKey]?.trim();
    if (key) return { provider: explicit, apiKey: key, ...config };
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    return {
      provider: "groq",
      apiKey: groqKey,
      ...PROVIDER_CONFIG.groq,
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    return {
      provider: "openai",
      apiKey: openAiKey,
      ...PROVIDER_CONFIG.openai,
    };
  }

  return null;
}

export function createAiClient(config: { apiKey: string; baseURL: string }) {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}
