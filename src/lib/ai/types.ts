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

export const aiJournalAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().min(20).max(1200),
  strengths: z.array(z.string().min(5).max(220)).min(1).max(5),
  improvementAreas: z
    .array(
      z.object({
        title: z.string().min(3).max(80),
        priority: z.enum(["high", "medium", "low"]),
        evidence: z.string().min(5).max(260),
        action: z.string().min(5).max(260),
      }),
    )
    .min(2)
    .max(6),
  riskFlags: z.array(z.string().min(5).max(220)).min(1).max(5),
  patternInsights: z.array(z.string().min(5).max(260)).min(1).max(6),
  nextReviewPlan: z.array(z.string().min(5).max(180)).min(3).max(5),
});

export type AiJournalAnalysis = z.infer<typeof aiJournalAnalysisSchema>;

export type AiJournalAnalysisResponse = {
  analysis: AiJournalAnalysis;
  generatedAt: string;
  tradeCount: number;
  closedTradeCount: number;
  disclaimer: string;
};
