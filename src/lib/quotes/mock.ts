/** Giả lập giá cơ sở + nhiễu nhỏ — thay bằng WebSocket/API broker khi tích hợp. */

export type QuoteRow = {
  symbol: string;
  name: string;
  group: "major" | "minor" | "metal" | "energy" | "crypto";
  bid: number;
  ask: number;
  changePct: number;
};

const BASE: Omit<QuoteRow, "bid" | "ask" | "changePct">[] = [
  { symbol: "EURUSD", name: "Euro / USD", group: "major" },
  { symbol: "GBPUSD", name: "Bảng Anh / USD", group: "major" },
  { symbol: "USDJPY", name: "USD / Yên", group: "major" },
  { symbol: "AUDUSD", name: "Úc / USD", group: "major" },
  { symbol: "USDCAD", name: "USD / CAD", group: "major" },
  { symbol: "NZDUSD", name: "NZD / USD", group: "major" },
  { symbol: "USDCHF", name: "USD / Franc", group: "major" },
  { symbol: "EURGBP", name: "Euro / Bảng", group: "minor" },
  { symbol: "EURJPY", name: "Euro / Yên", group: "minor" },
  { symbol: "GBPJPY", name: "Bảng / Yên", group: "minor" },
  { symbol: "XAUUSD", name: "Vàng spot", group: "metal" },
  { symbol: "XAGUSD", name: "Bạc spot", group: "metal" },
  { symbol: "USOIL", name: "Dầu WTI (tham chiếu)", group: "energy" },
  { symbol: "BTCUSD", name: "Bitcoin", group: "crypto" },
  { symbol: "ETHUSD", name: "Ethereum", group: "crypto" },
];

const midPrice: Record<string, number> = {
  EURUSD: 1.085,
  GBPUSD: 1.265,
  USDJPY: 149.2,
  AUDUSD: 0.652,
  USDCAD: 1.358,
  NZDUSD: 0.592,
  USDCHF: 0.884,
  EURGBP: 0.858,
  EURJPY: 161.9,
  GBPJPY: 188.7,
  XAUUSD: 2650,
  XAGUSD: 31.2,
  USOIL: 78.4,
  BTCUSD: 98500,
  ETHUSD: 3450,
};

function jitter(seed: number, magnitude: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * magnitude;
}

export function buildQuotes(tick: number): QuoteRow[] {
  return BASE.map((row, i) => {
    const mid = midPrice[row.symbol] ?? 1;
    const spread =
      row.group === "crypto"
        ? mid * 0.00015
        : row.group === "metal"
          ? mid * 0.00008
          : row.group === "energy"
            ? 0.02
            : row.symbol.includes("JPY")
              ? 0.015
              : 0.00012;
    const move = jitter(tick + i * 17, mid * 0.00025);
    const bid = mid + move - spread / 2;
    const ask = mid + move + spread / 2;
    const changePct = jitter(tick + i, 0.12);
    return {
      ...row,
      bid: Number(bid.toFixed(row.group === "crypto" ? 2 : 5)),
      ask: Number(ask.toFixed(row.group === "crypto" ? 2 : 5)),
      changePct: Number(changePct.toFixed(2)),
    };
  });
}
