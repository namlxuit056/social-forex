import { z } from "zod";
import { createAiClient } from "@/lib/ai/provider";

const symbolPlanSuggestionSchema = z.object({
  symbol: z.string(),
  bias: z.enum(["BULLISH", "BEARISH", "RANGE", "WAIT"]).default("WAIT"),
  keyLevels: z.string().nullable().default(null),
  newsToAvoid: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

const planAnalysisResultSchema = z.object({
  bias: z.enum(["BULLISH", "BEARISH", "RANGE", "WAIT"]).default("WAIT"),
  keyLevels: z.string().nullable().default(null),
  sessionFocus: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  symbolPlans: z.array(symbolPlanSuggestionSchema).default([]),
});

export type PlanAnalysisResult = z.infer<typeof planAnalysisResultSchema>;

export class ChartAnalysisUnavailableError extends Error {
  constructor() {
    super("Cần OPENAI_API_KEY hoặc GROQ_API_KEY để phân tích chart.");
    this.name = "ChartAnalysisUnavailableError";
  }
}

type VisionProvider = { apiKey: string; baseURL: string; model: string; hasVision: boolean };

function resolveVisionProvider(): VisionProvider | null {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    return { apiKey: openAiKey, baseURL: "https://api.openai.com/v1", model: "gpt-4o", hasVision: true };
  }
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    // llama-3.2-90b-vision-preview supports image inputs on Groq
    return { apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1", model: "llama-3.2-90b-vision-preview", hasVision: true };
  }
  return null;
}

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích kỹ thuật forex và hàng hóa. Hãy phân tích chart được cung cấp và đưa ra kế hoạch giao dịch hằng ngày có cấu trúc.

Trả về JSON hợp lệ với cấu trúc sau:
{
  "bias": "BULLISH" | "BEARISH" | "RANGE" | "WAIT",
  "keyLevels": "các vùng support/resistance quan trọng, hoặc null",
  "sessionFocus": "phiên nên tập trung, ví dụ: London open, Asia range, hoặc null",
  "notes": "nhận xét tổng quan, xác nhận, rủi ro cần lưu ý, hoặc null",
  "symbolPlans": [
    {
      "symbol": "XAUUSD",
      "bias": "BULLISH" | "BEARISH" | "RANGE" | "WAIT",
      "keyLevels": "các vùng giá cụ thể cho cặp này, hoặc null",
      "newsToAvoid": "tin tức cần tránh, hoặc null",
      "notes": "chi tiết setup, điều kiện vào lệnh, hoặc null"
    }
  ]
}

Yêu cầu:
- Viết tất cả bằng tiếng Việt
- Ghi cụ thể mức giá nếu nhìn thấy trên chart
- Giữ text ngắn gọn nhưng đủ thông tin thực hành
- Chỉ trả JSON, không giải thích thêm`;

const SYSTEM_PROMPT_TEXT_ONLY = `Bạn là chuyên gia phân tích kỹ thuật forex và hàng hóa. Dựa trên dữ liệu kỹ thuật được cung cấp, đưa ra kế hoạch giao dịch hằng ngày có cấu trúc.

Trả về JSON hợp lệ với cấu trúc sau:
{
  "bias": "BULLISH" | "BEARISH" | "RANGE" | "WAIT",
  "keyLevels": "các vùng support/resistance quan trọng, hoặc null",
  "sessionFocus": "phiên nên tập trung, hoặc null",
  "notes": "nhận xét tổng quan, xác nhận xu hướng, hoặc null",
  "symbolPlans": [
    {
      "symbol": "XAUUSD",
      "bias": "BULLISH" | "BEARISH" | "RANGE" | "WAIT",
      "keyLevels": "các vùng giá cụ thể, hoặc null",
      "newsToAvoid": "tin tức cần tránh, hoặc null",
      "notes": "chi tiết setup, hoặc null"
    }
  ]
}

Yêu cầu:
- Viết tất cả bằng tiếng Việt
- Ngắn gọn và thực hành
- Chỉ trả JSON, không giải thích thêm`;

function parseResult(raw: string): PlanAnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      bias: "WAIT",
      keyLevels: null,
      sessionFocus: null,
      notes: raw.slice(0, 800),
      symbolPlans: [],
    };
  }

  const result = planAnalysisResultSchema.safeParse(parsed);
  if (!result.success) {
    return {
      bias: "WAIT",
      keyLevels: null,
      sessionFocus: null,
      notes: null,
      symbolPlans: [],
    };
  }
  return result.data;
}

export async function analyzeChartForPlan(
  imageUrls: string[],
  symbols: string[],
  technicalContext?: string | null,
): Promise<PlanAnalysisResult> {
  const provider = resolveVisionProvider();
  if (!provider) throw new ChartAnalysisUnavailableError();

  const client = createAiClient(provider);
  const symbolHint = symbols.length > 0 ? `Cặp cần phân tích: ${symbols.join(", ")}. ` : "";

  // Vision analysis with chart images
  if (imageUrls.length > 0 && provider.hasVision) {
    const imageContent = imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" as const },
    }));

    const textParts: string[] = [symbolHint];
    if (technicalContext) textParts.push(`Dữ liệu kỹ thuật bổ sung:\n${technicalContext}`);
    textParts.push(`Phân tích ${imageUrls.length > 1 ? "các chart sau" : "chart sau"} và tạo kế hoạch giao dịch hôm nay.`);

    const response = await client.chat.completions.create({
      model: provider.model,
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: textParts.join("\n\n") },
            ...imageContent,
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    return parseResult(raw);
  }

  // Text-only fallback using technical context
  if (!technicalContext) {
    throw new Error("Cần ảnh chart hoặc dữ liệu kỹ thuật để phân tích.");
  }

  const response = await client.chat.completions.create({
    model: provider.hasVision ? provider.model : "llama-3.3-70b-versatile",
    temperature: 0.2,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT_TEXT_ONLY },
      {
        role: "user",
        content: `${symbolHint}\n\nDữ liệu kỹ thuật:\n${technicalContext}\n\nTạo kế hoạch giao dịch hôm nay.`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return parseResult(raw);
}
