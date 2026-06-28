"server only";

import { put } from "@vercel/blob";

/**
 * Generate a candlestick pattern image using Google Gemini Imagen 3.
 * Falls back to null if GEMINI_API_KEY or BLOB_READ_WRITE_TOKEN is missing.
 * The caller should then fall back to pollinationsImageUrl.
 */
export async function generateLessonImage(
  topic: string,
  slug: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!apiKey || !blobToken) return null;

  const prompt =
    `Technical analysis educational diagram of the "${topic}" candlestick pattern for forex/stock trading. ` +
    `Dark trading terminal background (#1a1a2e or similar). Accurate multi-candle chart clearly showing ` +
    `the exact pattern formation with green bullish and red bearish candles. Clean labeled infographic ` +
    `with arrows and annotations explaining the pattern. Professional educational illustration style, ` +
    `high contrast, no text clutter.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      console.error("[gemini-image] API error:", res.status, err.slice(0, 200));
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
      }>;
    };
    const b64 = data.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData?.mimeType?.startsWith("image/"),
    )?.inlineData?.data;
    if (!b64) return null;

    const buffer = Buffer.from(b64, "base64");
    const blob = await put(`academy/${slug}-${Date.now()}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      token: blobToken,
    });

    return blob.url;
  } catch (e) {
    console.error("[gemini-image] Failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
