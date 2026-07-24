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

function truncate(value: unknown, max: number): unknown {
  if (typeof value === "string" && value.length > max) {
    return value.slice(0, max - 1).trimEnd() + "…";
  }
  return value;
}

/**
 * LLMs occasionally overflow the checklist/reasoning length limits despite
 * prompt instructions. Truncate before Zod validation so a slightly long
 * response doesn't hard-fail the whole analysis.
 */
export function sanitizeAiSuggestionPayload(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...obj };

  if (Array.isArray(obj.tradeChecklist)) {
    sanitized.tradeChecklist = obj.tradeChecklist.map((item) => {
      if (!item || typeof item !== "object") return item;
      const checklistItem = item as Record<string, unknown>;
      return {
        ...checklistItem,
        label: truncate(checklistItem.label, 80),
        detail: truncate(checklistItem.detail, 180),
      };
    });
  }

  if (typeof obj.reasoning === "string") {
    sanitized.reasoning = truncate(obj.reasoning, 1500);
  }

  return sanitized;
}

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

/**
 * LLMs occasionally overflow the string length limits despite prompt
 * instructions. Truncate before Zod validation so a slightly long
 * response doesn't hard-fail the whole analysis.
 */
export function sanitizeAiJournalAnalysisPayload(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...obj };

  if (typeof obj.summary === "string") sanitized.summary = truncate(obj.summary, 1200);

  if (Array.isArray(obj.strengths)) {
    sanitized.strengths = obj.strengths.map((item) => truncate(item, 220));
  }

  if (Array.isArray(obj.improvementAreas)) {
    sanitized.improvementAreas = obj.improvementAreas.map((item) => {
      if (!item || typeof item !== "object") return item;
      const area = item as Record<string, unknown>;
      return {
        ...area,
        title: truncate(area.title, 80),
        evidence: truncate(area.evidence, 260),
        action: truncate(area.action, 260),
      };
    });
  }

  if (Array.isArray(obj.riskFlags)) {
    sanitized.riskFlags = obj.riskFlags.map((item) => truncate(item, 220));
  }

  if (Array.isArray(obj.patternInsights)) {
    sanitized.patternInsights = obj.patternInsights.map((item) => truncate(item, 260));
  }

  if (Array.isArray(obj.nextReviewPlan)) {
    sanitized.nextReviewPlan = obj.nextReviewPlan.map((item) => truncate(item, 180));
  }

  return sanitized;
}

export type AiJournalAnalysisResponse = {
  analysis: AiJournalAnalysis;
  generatedAt: string;
  tradeCount: number;
  closedTradeCount: number;
  disclaimer: string;
};

export const aiPortfolioReviewSchema = z.object({
  overallRiskLevel: z.enum(["low", "medium", "high"]),
  totalExposurePct: z.number().min(0).max(500),
  summary: z.string().min(20).max(600),
  correlationWarnings: z.array(z.string().min(5).max(220)).max(5),
  positionAdvice: z
    .array(
      z.object({
        ticket: z.string().min(1).max(40),
        symbol: z.string().min(1).max(20),
        action: z.enum(["hold", "trim", "close"]),
        reason: z.string().min(5).max(220),
      }),
    )
    .max(30),
});

export type AiPortfolioReview = z.infer<typeof aiPortfolioReviewSchema>;

export type AiPortfolioReviewResponse = {
  review: AiPortfolioReview;
  generatedAt: string;
  positionCount: number;
  disclaimer: string;
};

export const aiPositionReviewSchema = z.object({
  action: z.enum(["hold", "trim", "close"]),
  trendAlignment: z.enum(["bullish", "bearish", "neutral"]),
  confidence: z.number().min(1).max(5),
  summary: z.string().min(20).max(400),
  reasoning: z.string().min(20).max(1200),
  invalidationLevel: z.number().positive().optional(),
});

export type AiPositionReview = z.infer<typeof aiPositionReviewSchema>;

export type AiPositionReviewResponse = {
  review: AiPositionReview;
  technicalContext?: TradingViewTechnicalContext;
  generatedAt: string;
  disclaimer: string;
};

/**
 * LLMs occasionally overflow the string length limits despite prompt
 * instructions. Truncate before Zod validation so a slightly long
 * response doesn't hard-fail the whole review.
 */
export function sanitizeAiPositionReviewPayload(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...obj };

  if (typeof obj.summary === "string") sanitized.summary = truncate(obj.summary, 400);
  if (typeof obj.reasoning === "string") sanitized.reasoning = truncate(obj.reasoning, 1200);

  return sanitized;
}

/**
 * LLMs occasionally overflow the string length limits despite prompt
 * instructions. Truncate before Zod validation so a slightly long
 * response doesn't hard-fail the whole review.
 */
export function sanitizeAiPortfolioReviewPayload(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...obj };

  if (typeof obj.summary === "string") {
    sanitized.summary = truncate(obj.summary, 600);
  }

  if (Array.isArray(obj.correlationWarnings)) {
    sanitized.correlationWarnings = obj.correlationWarnings.map((item) => truncate(item, 220));
  }

  if (Array.isArray(obj.positionAdvice)) {
    sanitized.positionAdvice = obj.positionAdvice.map((item) => {
      if (!item || typeof item !== "object") return item;
      const advice = item as Record<string, unknown>;
      return { ...advice, reason: truncate(advice.reason, 220) };
    });
  }

  return sanitized;
}
