const INDEX_SYMBOLS = ["US30", "NAS100", "SPX500", "GER40", "UK100", "JP225", "US500", "GER30", "AUS200", "FRA40"];

export function getPipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("JPY")) return 0.01;
  if (s.startsWith("XAU")) return 0.1;
  if (s.startsWith("XAG")) return 0.01;
  if (INDEX_SYMBOLS.some((idx) => s.startsWith(idx))) return 1;
  if (s.includes("BTC") || s.includes("ETH") || s.includes("XRP") || s.includes("LTC")) return 1;
  return 0.0001;
}
