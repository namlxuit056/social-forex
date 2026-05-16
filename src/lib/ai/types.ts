import { z } from "zod";
import type { TradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import type { AiNewsContext } from "@/lib/ai/news-context";

export const aiSuggestionSchema = z.object({
  direction: z.enum(["LONG", "SHORT"]),
  entry: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  confidence: z.number().min(1).max(5),
  qualityScore: z.number().min(0).max(100),
  tradeChecklist: z
    .array(
      z.object({
        label: z.string().min(3).max(80),
        status: z.enum(["pass", "warn", "fail"]),
        detail: z.string().min(3).max(180),
      }),
    )
    .min(4)
    .max(6),
  reasoning: z.string().min(10).max(1500),
  keyLevels: z
    .object({
      support: z.number().positive(),
      resistance: z.number().positive(),
    })
    .optional(),
});

export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;

export type AiSuggestResponse = {
  symbol: string;
  suggestion: AiSuggestion;
  technicalContext?: TradingViewTechnicalContext;
  newsContext?: AiNewsContext;
  generatedAt: string;
  disclaimer: string;
};

export type AiSuggestError = {
  error: string;
  retryAfterMs?: number;
};

export const aiAdvisorMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

export const aiAdvisorRequestSchema = z.object({
  messages: z.array(aiAdvisorMessageSchema).min(1).max(12),
});

export type AiAdvisorMessage = z.infer<typeof aiAdvisorMessageSchema>;

export type AiAdvisorResponse = {
  message: AiAdvisorMessage;
  generatedAt: string;
  disclaimer: string;
};
