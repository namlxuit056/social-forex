import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { fetchChartImage, formatTechnicalContextBlock, getSymbolTechnicalContext } from "@/lib/ai/forex-chart";
import { createAiClient, resolveAiProvider, resolveMaxTokens } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";
import { sendTelegramChannelPost } from "@/lib/telegram";
import {
  VN_TZ,
  campaignUrl,
  composeFacebookPost,
  composeTelegramPost,
  isVnWeekend,
  vnDay,
} from "@/lib/marketing/daily-post-format";

const SYMBOL = "XAUUSD";
const LANDING_PATH = "/";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolforex.xyz").replace(/\/$/, "");

const aiPostSchema = z.object({
  bias: z.enum(["BUY", "SELL", "NEUTRAL"]),
  headline: z.string().min(10).max(140),
  telegram: z.string().min(60).max(1500),
  facebook: z.string().min(100).max(2000),
  video: z.string().min(80).max(1800),
});

const SYSTEM_PROMPT = `Bạn là biên tập viên thị trường của Social Forex, viết cho trader Việt mới và trung cấp giao dịch vàng (XAUUSD).
Viết tiếng Việt tự nhiên, ngắn, cụ thể. Chỉ dùng con số có trong dữ liệu được cung cấp (giá, EMA, Bollinger, high/low…), làm tròn giá vàng đến 1 chữ số thập phân. Không bịa số, không hứa lợi nhuận, không nói "chắc chắn". Có thể nêu thiên hướng (bias) và kịch bản dạng giáo dục.
Trả về JSON đúng các khoá:
- "bias": "BUY" | "SELL" | "NEUTRAL" — thiên hướng trong ngày theo dữ liệu kỹ thuật.
- "headline": 1 dòng tiêu đề có emoji đầu dòng, ví dụ "🟡 Vàng 10/11: canh bán quanh 4,135".
- "telegram": 5–8 dòng cho kênh Telegram: xu hướng H4/D1, 2 mốc kháng cự, 2 mốc hỗ trợ, kịch bản nếu phá lên / phá xuống, tin USD cần chú ý trong ngày (nếu có). Không chèn link.
- "facebook": 6–10 dòng cho nhóm Facebook trader: giọng một trader chia sẻ nhận định, mở bằng 1 câu gợi chuyện, nêu mốc và kịch bản, kết bằng 1 câu hỏi mời mọi người bình luận. Không chèn link, không hashtag.
- "video": kịch bản video dọc 30–45 giây "Vàng hôm nay: 3 mốc cần canh", chia đoạn theo thời gian [0-3s] câu mở gây chú ý, [3-30s] 3 mốc và ý nghĩa, [30-40s] tin cần canh và lời nhắc quản lý rủi ro, [40-45s] kêu gọi theo dõi kênh. Mỗi đoạn ghi lời đọc và gợi ý chữ trên màn hình.`;

type CalendarLine = { time: string; title: string; impact: string; forecast: string | null; previous: string | null };

async function todaysUsdEvents(now: Date): Promise<CalendarLine[]> {
  const day = vnDay(now);
  const start = fromZonedTime(`${day}T00:00:00`, VN_TZ);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const rows = await prisma.economicCalendarEvent.findMany({
    where: { timeUtc: { gte: start, lt: end }, currency: "USD", impact: { in: ["high", "medium"] } },
    orderBy: { timeUtc: "asc" },
    take: 8,
  });
  return rows.map((r) => ({
    time: formatInTimeZone(r.timeUtc, VN_TZ, "HH:mm"),
    title: r.title,
    impact: r.impact,
    forecast: r.forecast,
    previous: r.previous,
  }));
}

async function writePostWithAi(now: Date) {
  const resolved = await resolveAiProvider();
  if (!resolved) throw new Error("No AI provider configured");

  const technical = await getSymbolTechnicalContext(SYMBOL, "metal");
  if (!technical) throw new Error("TradingView technical data unavailable for XAUUSD");
  const events = await todaysUsdEvents(now);

  const userPrompt = [
    `Ngày (giờ VN): ${formatInTimeZone(now, VN_TZ, "dd/MM/yyyy")}`,
    "",
    "Dữ liệu kỹ thuật TradingView:",
    formatTechnicalContextBlock(technical),
    "",
    "Tin USD (high/medium) hôm nay, giờ VN:",
    events.length
      ? events
          .map((e) => `- ${e.time} ${e.title} [${e.impact}] dự báo ${e.forecast ?? "n/a"}, trước ${e.previous ?? "n/a"}`)
          .join("\n")
      : "- Không có tin USD quan trọng.",
  ].join("\n");

  const client = createAiClient(resolved);
  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.5 } : {}),
    max_tokens: resolveMaxTokens(resolved, 1800),
    ...(resolved.supportsJsonResponseFormat ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned an empty response");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI response is not valid JSON");
  }
  const result = aiPostSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid AI post: ${result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(", ")}`);
  }
  return result.data;
}

async function generatePost(now: Date) {
  const ai = await writePostWithAi(now);
  const chart = await fetchChartImage(SYMBOL).catch(() => null);
  return {
    bias: ai.bias,
    headline: ai.headline,
    telegramText: composeTelegramPost({
      headline: ai.headline,
      body: ai.telegram,
      url: campaignUrl(SITE_URL, LANDING_PATH, "telegram"),
    }),
    facebookText: composeFacebookPost({ body: ai.facebook, url: campaignUrl(SITE_URL, LANDING_PATH, "facebook") }),
    videoScript: `${ai.video.trim()}\n\nLink trong bio: ${campaignUrl(SITE_URL, LANDING_PATH, "tiktok")}`,
    chartImageUrl: chart?.url ?? null,
  };
}

async function sendToTelegram(id: string) {
  const post = await prisma.dailyMarketPost.findUniqueOrThrow({ where: { id } });
  try {
    await sendTelegramChannelPost({ html: post.telegramText, photoUrl: post.chartImageUrl });
    await prisma.dailyMarketPost.update({ where: { id }, data: { telegramSentAt: new Date(), telegramError: null } });
    return "sent" as const;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.dailyMarketPost.update({ where: { id }, data: { telegramError: message.slice(0, 500) } });
    return "error" as const;
  }
}

export type DailyPostRunResult = {
  ok: boolean;
  day: string;
  skipped?: "weekend";
  id?: string;
  generated?: boolean;
  telegram?: "sent" | "error" | "already_sent" | "not_sent";
  error?: string;
};

/**
 * Morning job: write today's XAUUSD note once (force rewrites it), store it for
 * the admin copy page, and post it to the Telegram channel unless already sent.
 */
export async function runDailyMarketPost(
  options: { force?: boolean; sendTelegram?: boolean; now?: Date } = {},
): Promise<DailyPostRunResult> {
  const now = options.now ?? new Date();
  const day = vnDay(now);
  if (!options.force && isVnWeekend(now)) return { ok: true, day, skipped: "weekend" };

  try {
    let post = await prisma.dailyMarketPost.findUnique({ where: { day_symbol: { day, symbol: SYMBOL } } });
    let generated = false;
    if (!post || options.force) {
      const data = await generatePost(now);
      post = await prisma.dailyMarketPost.upsert({
        where: { day_symbol: { day, symbol: SYMBOL } },
        create: { day, symbol: SYMBOL, ...data },
        update: { ...data, telegramSentAt: null, telegramError: null },
      });
      generated = true;
    }

    let telegram: DailyPostRunResult["telegram"] = "not_sent";
    if (post.telegramSentAt) telegram = "already_sent";
    else if (options.sendTelegram !== false) telegram = await sendToTelegram(post.id);

    return { ok: true, day, id: post.id, generated, telegram };
  } catch (err) {
    return { ok: false, day, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function resendDailyPostToTelegram(id: string) {
  return sendToTelegram(id);
}
