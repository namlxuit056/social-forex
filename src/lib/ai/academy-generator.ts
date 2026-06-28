import { z } from "zod";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import { pollinationsImageUrl } from "@/lib/ai/pollinations-image";

export type LessonLevel = "beginner" | "intermediate" | "advanced";

export type GeneratedLesson = {
  slug: string;
  level: LessonLevel;
  titleVi: string;
  titleEn: string;
  summaryVi: string;
  summaryEn: string;
  bodyVi: string;
  bodyEn: string;
  keywordsVi: string[];
  keywordsEn: string[];
  imageUrl: string | null;
  quizzes: GeneratedQuiz[];
};

export type GeneratedQuiz = {
  order: number;
  questionVi: string;
  questionEn: string;
  optionsVi: string[];
  optionsEn: string[];
  correctIndex: number;
};

const quizSchema = z.object({
  questionVi: z.string().min(10),
  questionEn: z.string().min(10),
  optionsVi: z.array(z.string().min(2)).length(4),
  optionsEn: z.array(z.string().min(2)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

const lessonSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  titleVi: z.string().min(10).max(120),
  titleEn: z.string().min(10).max(120),
  summaryVi: z.string().min(30).max(300),
  summaryEn: z.string().min(30).max(300),
  bodyVi: z.string().min(400),
  bodyEn: z.string().min(400),
  keywordsVi: z.array(z.string()).min(2).max(6),
  keywordsEn: z.array(z.string()).min(2).max(6),
  quizzes: z.array(quizSchema).min(3).max(5),
});

function buildPrompt(topic: string, level: LessonLevel): string {
  const levelDesc =
    level === "beginner"
      ? "người mới bắt đầu giao dịch, dùng ngôn ngữ đơn giản, tránh thuật ngữ phức tạp"
      : level === "intermediate"
        ? "trader đã biết cơ bản, có thể dùng thuật ngữ kỹ thuật nhưng giải thích rõ"
        : "trader nâng cao, có thể dùng đầy đủ thuật ngữ SMC/price action";

  return `Bạn là chuyên gia giáo dục forex với kinh nghiệm viết tài liệu học tập bilingual (Vietnamese + English).

Viết một bài học Academy về chủ đề: "${topic}"
Cấp độ: ${level} (dành cho ${levelDesc})

Trả về JSON hợp lệ với cấu trúc sau (KHÔNG thêm markdown, chỉ JSON thuần):

{
  "slug": "kebab-case-unique-slug-in-english",
  "titleVi": "Tiêu đề tiếng Việt (ngắn gọn, 8-70 ký tự)",
  "titleEn": "English title (concise, 8-70 chars)",
  "summaryVi": "Tóm tắt tiếng Việt, 1-2 câu mô tả bài học (50-200 ký tự)",
  "summaryEn": "English summary, 1-2 sentences (50-200 chars)",
  "bodyVi": "Nội dung bài học tiếng Việt. Dùng ## cho heading, - cho bullet, **text** cho bold. Tối thiểu 500 ký tự. Bao gồm: định nghĩa, cách nhận diện, cách giao dịch, ví dụ thực tế, lỗi phổ biến.",
  "bodyEn": "English lesson body. Use ## for headings, - for bullets, **text** for bold. Minimum 500 chars. Include: definition, how to identify, how to trade, real examples, common mistakes.",
  "keywordsVi": ["từ khóa 1", "từ khóa 2", "từ khóa 3"],
  "keywordsEn": ["keyword 1", "keyword 2", "keyword 3"],
  "quizzes": [
    {
      "questionVi": "Câu hỏi tiếng Việt?",
      "questionEn": "English question?",
      "optionsVi": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "optionsEn": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    }
  ]
}

Yêu cầu quiz:
- Viết đúng 4 câu hỏi (quizzes array có 4 phần tử)
- Mỗi câu có đúng 4 lựa chọn
- correctIndex là index (0-3) của đáp án đúng
- Câu hỏi phải kiểm tra kiến thức thực tế từ bài học, không phải câu hỏi chung chung
- Phân phối correctIndex đa dạng (không phải tất cả đều là 0 hoặc 1)`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const topicIdeaSchema = z.object({
  topic: z.string().min(3).max(100),
  level: z.enum(["beginner", "intermediate", "advanced"]),
});

const topicIdeasSchema = z.object({
  topics: z.array(topicIdeaSchema).min(1).max(20),
});

export type TopicIdea = {
  topic: string;
  level: LessonLevel;
};

export async function generateTopicIdeas(
  count: number,
  existingTitles: string[] = [],
): Promise<TopicIdea[]> {
  const resolved = resolveAiProvider();
  if (!resolved) throw new Error("No AI API key configured.");

  const client = createAiClient(resolved);

  const existingList =
    existingTitles.length > 0
      ? `\nChủ đề đã có (KHÔNG lặp lại):\n${existingTitles.map((t) => `- ${t}`).join("\n")}`
      : "";

  const prompt = `Bạn là chuyên gia forex. Hãy đề xuất ${count} chủ đề bài học đa dạng cho Academy forex trading về price action và mô hình nến (candlestick patterns).${existingList}

Yêu cầu:
- Chủ đề phải cụ thể, thực dụng (VD: "Hammer Candle", "Bearish Engulfing", "Morning Star", "Order Block", "Liquidity Grab", "Fair Value Gap", "Bullish Marubozu")
- Phân bổ cấp độ đa dạng: beginner, intermediate, advanced
- KHÔNG lặp lại chủ đề đã có
- Trả về JSON: { "topics": [{ "topic": "Tên chủ đề (tiếng Anh)", "level": "beginner|intermediate|advanced" }] }`;

  const response = await client.chat.completions.create({
    model: resolved.model,
    max_tokens: 800,
    ...(resolved.supportsTemperature ? { temperature: 0.75 } : {}),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a forex education expert. Respond with valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const validated = topicIdeasSchema.safeParse(parsed);
  if (!validated.success) throw new Error("Topic ideas validation failed");

  return validated.data.topics.slice(0, count) as TopicIdea[];
}

export async function generateAcademyLesson(
  topic: string,
  level: LessonLevel,
): Promise<GeneratedLesson> {
  const resolved = resolveAiProvider();
  if (!resolved) {
    throw new Error(
      "No AI API key configured. Add GROQ_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY to .env.",
    );
  }

  const client = createAiClient(resolved);

  const response = await client.chat.completions.create({
    model: resolved.model,
    max_tokens: 4000,
    ...(resolved.supportsTemperature ? { temperature: 0.4 } : {}),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a bilingual (Vietnamese/English) forex education expert. Always respond with valid JSON only, no markdown code blocks.",
      },
      { role: "user", content: buildPrompt(topic, level) },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const validated = lessonSchema.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`AI response validation failed: ${issues}`);
  }

  const data = validated.data;
  const slug = data.slug || slugify(topic);

  const imageUrl = pollinationsImageUrl(topic, slug);

  return {
    slug,
    level,
    titleVi: data.titleVi,
    titleEn: data.titleEn,
    summaryVi: data.summaryVi,
    summaryEn: data.summaryEn,
    bodyVi: data.bodyVi,
    bodyEn: data.bodyEn,
    keywordsVi: data.keywordsVi,
    keywordsEn: data.keywordsEn,
    imageUrl,
    quizzes: data.quizzes.map((q, i) => ({ ...q, order: i })),
  };
}
