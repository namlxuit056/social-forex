import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type AiProvider = "deepseek" | "groq" | "openai" | "anthropic";

type ProviderConfig = {
  baseURL: string;
  model: string;
  envKey: string;
  /** DeepSeek-R1 rejects temperature param — must be omitted */
  supportsTemperature: boolean;
  /** Some models (deepseek-v4-pro, Claude) return empty/invalid content when response_format is set */
  supportsJsonResponseFormat: boolean;
  maxTokens: number;
  /** Extra token budget for internal chain-of-thought in reasoning models (0 for non-reasoning) */
  reasoningOverhead: number;
};

export const PROVIDER_CONFIG: Record<AiProvider, ProviderConfig> = {
  deepseek: {
    baseURL: "https://api.deepseek.com",
    model: "deepseek-v4-pro",
    envKey: "DEEPSEEK_API_KEY",
    supportsTemperature: true,
    supportsJsonResponseFormat: false,
    maxTokens: 10000,
    reasoningOverhead: 10000,
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
  anthropic: {
    baseURL: "https://api.anthropic.com",
    model: "claude-sonnet-5",
    envKey: "ANTHROPIC_API_KEY",
    supportsTemperature: false,
    supportsJsonResponseFormat: false,
    maxTokens: 4096,
    reasoningOverhead: 0,
  },
};

/** Curated models selectable from the admin UI, per provider. */
export const SELECTABLE_MODELS: Record<AiProvider, string[]> = {
  deepseek: ["deepseek-v4-pro", "deepseek-v4-flash"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  openai: ["gpt-4o-mini", "gpt-4o"],
  anthropic: ["claude-sonnet-5", "claude-opus-4-8", "claude-haiku-4-5"],
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

// In-memory cache for the DB-backed setting — avoids hitting the DB on every AI
// call (Neon free tier can't sustain per-request polling; see prior cron incident).
const SETTING_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSetting: { provider: AiProvider | null; model: string | null; at: number } | null = null;

/** Call after writing AiModelSetting so this instance picks up the change immediately. */
export function invalidateAiModelSettingCache() {
  cachedSetting = null;
}

async function getDbAiModelSetting(): Promise<{ provider: AiProvider | null; model: string | null }> {
  if (cachedSetting && Date.now() - cachedSetting.at < SETTING_CACHE_TTL_MS) {
    return cachedSetting;
  }
  try {
    // Lazy import: keeps this module side-effect-free at load time (Prisma throws
    // immediately if DATABASE_URL is unset, e.g. in unit tests that never call this).
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.aiModelSetting.findUnique({ where: { id: "default" } });
    const provider = row?.provider && row.provider in PROVIDER_CONFIG ? (row.provider as AiProvider) : null;
    cachedSetting = { provider, model: row?.model?.trim() || null, at: Date.now() };
  } catch {
    // DB unreachable — fall back to env-based resolution below without caching the miss
    return { provider: null, model: null };
  }
  return cachedSetting;
}

export async function resolveAiProvider(): Promise<ResolvedAiProvider | null> {
  // 1. Admin-configured setting (DB), if the corresponding API key is present
  const dbSetting = await getDbAiModelSetting();
  if (dbSetting.provider) {
    const config = PROVIDER_CONFIG[dbSetting.provider];
    const key = process.env[config.envKey]?.trim();
    if (key) {
      return {
        provider: dbSetting.provider,
        apiKey: key,
        ...config,
        model: dbSetting.model || config.model,
      };
    }
  }

  // 2. Explicit env override
  const explicit = process.env.AI_PROVIDER?.toLowerCase() as AiProvider;
  if (explicit && PROVIDER_CONFIG[explicit]) {
    const config = PROVIDER_CONFIG[explicit];
    const key = process.env[config.envKey]?.trim();
    if (key) return { provider: explicit, apiKey: key, ...config };
  }

  // 3. Priority: deepseek (R1 reasoning) → groq (fast/free) → openai → anthropic
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

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    return { provider: "anthropic", apiKey: anthropicKey, ...PROVIDER_CONFIG.anthropic };
  }

  return null;
}

type ChatCompletionParams = {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
};

type ChatCompletionResult = {
  choices: [{ message: { content: string | null }; finish_reason: string }];
};

/**
 * Anthropic's Messages API is not OpenAI-compatible (system prompt is a separate
 * top-level field, no `response_format` JSON mode, no `temperature` on current
 * Claude models). This shim mimics the `client.chat.completions.create(...)`
 * surface every AI call site already uses, so no call site needs to branch on
 * provider — only `createAiClient` does.
 */
function createAnthropicShimClient(apiKey: string) {
  const anthropic = new Anthropic({ apiKey });
  return {
    chat: {
      completions: {
        create: async (params: ChatCompletionParams): Promise<ChatCompletionResult> => {
          const systemText = params.messages
            .filter((m) => m.role === "system")
            .map((m) => m.content)
            .join("\n\n");
          const turns = params.messages.filter(
            (m): m is { role: "user" | "assistant"; content: string } => m.role !== "system",
          );

          const system =
            params.response_format?.type === "json_object"
              ? `${systemText}\n\nRespond with ONLY valid JSON. No markdown code fences, no explanation, no preamble.`
              : systemText;

          const response = await anthropic.messages.create({
            model: params.model,
            max_tokens: params.max_tokens ?? 4096,
            system: system || undefined,
            messages: turns.length > 0 ? turns : [{ role: "user", content: "" }],
          });

          const textBlock = response.content.find((block) => block.type === "text");
          const content = textBlock && "text" in textBlock ? textBlock.text : null;

          return {
            choices: [
              {
                message: { content },
                finish_reason: response.stop_reason ?? "stop",
              },
            ],
          };
        },
      },
    },
  };
}

export function createAiClient(config: { apiKey: string; baseURL: string; provider?: undefined }): OpenAI;
export function createAiClient(config: {
  apiKey: string;
  baseURL: string;
  provider: AiProvider;
}): OpenAI | ReturnType<typeof createAnthropicShimClient>;
export function createAiClient(config: { provider?: AiProvider; apiKey: string; baseURL: string }) {
  if (config.provider === "anthropic") {
    return createAnthropicShimClient(config.apiKey);
  }
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}
