/** Official MetaTrader 5 download (MetaQuotes). */
export function getMt5DownloadUrl(locale: string): string {
  return locale === "vi"
    ? "https://www.metatrader5.com/en/download"
    : "https://www.metatrader5.com/en/download";
}

/** Exness MT5 product page (helps match broker + terminal). */
export const EXNESS_MT5_PLATFORM_URL =
  "https://www.exness.com/platforms/metatrader-5/";
