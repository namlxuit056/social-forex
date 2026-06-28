/**
 * Pollinations.ai — free AI image generation, no API key required.
 * URL format: https://image.pollinations.ai/prompt/{encoded}?...
 * The seed derived from the slug ensures the same prompt always returns the same image.
 */
export function pollinationsImageUrl(topic: string, slug: string): string {
  const seed = slug.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 1_000_000;
  const prompt = encodeURIComponent(
    `${topic} candlestick pattern forex trading, educational technical analysis illustration, ` +
      `clean dark trading terminal background, green bullish red bearish candles, professional infographic`,
  );
  return `https://image.pollinations.ai/prompt/${prompt}?width=800&height=450&seed=${seed}&nologo=true&model=flux`;
}
