/**
 * Mapping from internal symbol (EURUSD) to TradingView widget symbol (OANDA:EURUSD).
 * Crypto uses BITSTAMP, commodities use TVC/NYMEX.
 */
const TV_MAP: Record<string, string> = {
  EURUSD: "OANDA:EURUSD",
  GBPUSD: "OANDA:GBPUSD",
  USDJPY: "OANDA:USDJPY",
  AUDUSD: "OANDA:AUDUSD",
  USDCAD: "OANDA:USDCAD",
  NZDUSD: "OANDA:NZDUSD",
  USDCHF: "OANDA:USDCHF",
  EURGBP: "OANDA:EURGBP",
  EURJPY: "OANDA:EURJPY",
  GBPJPY: "OANDA:GBPJPY",
  XAUUSD: "TVC:GOLD",
  XAGUSD: "TVC:SILVER",
  USOIL: "NYMEX:CL1!",
  BTCUSD: "BITSTAMP:BTCUSD",
  ETHUSD: "BITSTAMP:ETHUSD",
};

export function toTradingViewSymbol(symbol: string): string {
  return TV_MAP[symbol.toUpperCase()] ?? `OANDA:${symbol.toUpperCase()}`;
}
