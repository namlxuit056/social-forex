import { z } from "zod";

export const aiSuggestionSchema = z.object({
  direction: z.enum(["LONG", "SHORT"]),
  entry: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  confidence: z.number().min(1).max(5),
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
  generatedAt: string;
  disclaimer: string;
};

export type AiSuggestError = {
  error: string;
  retryAfterMs?: number;
};
