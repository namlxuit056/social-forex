/** Công cụ tính toán — công thức chuẩn, đơn vị pip theo cặp. */

export type PipContext = {
  /** Giá hiện tại (để quy đổi pip → tiền) */
  price: number;
  /** Đồng quote (USD, JPY, ...) */
  quote: "USD" | "JPY" | "other";
  /** Lot chuẩn */
  contractSize?: number;
};

export function pipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("JPY")) return 0.01;
  if (s.startsWith("XAU") || s.includes("GOLD")) return 0.1;
  if (s.startsWith("XAG") || s.includes("SILVER")) return 0.01;
  if (s.includes("OIL")) return 0.01;
  if (s.startsWith("BTC") || s.startsWith("ETH")) return 1;
  return 0.0001;
}

export function stopLossPips(params: {
  symbol: string;
  entry: number;
  stopLoss: number;
}): number {
  const distance = Math.abs(params.entry - params.stopLoss);
  const pip = pipSize(params.symbol);
  return Number((distance / pip).toFixed(1));
}

export function positionSizeLots(params: {
  balance: number;
  riskPct: number;
  stopLossPips: number;
  symbol: string;
  price: number;
  quote: PipContext["quote"];
}): { lots: number; riskAmount: number; pipValuePerLot: number } {
  const {
    balance,
    riskPct,
    stopLossPips,
    symbol,
    price,
    quote,
  } = params;
  if (
    !Number.isFinite(balance) ||
    !Number.isFinite(riskPct) ||
    !Number.isFinite(stopLossPips) ||
    !Number.isFinite(price) ||
    balance <= 0 ||
    riskPct <= 0 ||
    stopLossPips <= 0 ||
    price <= 0
  ) {
    return { lots: 0, riskAmount: 0, pipValuePerLot: 0 };
  }

  const riskAmount = (balance * riskPct) / 100;
  const pip = pipSize(symbol);
  const contract = 100000;
  let pipValuePerLot: number;
  if (quote === "JPY") {
    pipValuePerLot = (contract * pip) / price;
  } else {
    pipValuePerLot = contract * pip;
  }
  const lots = riskAmount / (stopLossPips * pipValuePerLot);
  return {
    lots: Math.max(0, Number(lots.toFixed(2))),
    riskAmount: Number(riskAmount.toFixed(2)),
    pipValuePerLot: Number(pipValuePerLot.toFixed(2)),
  };
}

export function pivotClassic(high: number, low: number, close: number) {
  const p = (high + low + close) / 3;
  const r1 = 2 * p - low;
  const s1 = 2 * p - high;
  const r2 = p + (high - low);
  const s2 = p - (high - low);
  const r3 = high + 2 * (p - low);
  const s3 = low - 2 * (high - p);
  return {
    pivot: Number(p.toFixed(5)),
    r1: Number(r1.toFixed(5)),
    r2: Number(r2.toFixed(5)),
    r3: Number(r3.toFixed(5)),
    s1: Number(s1.toFixed(5)),
    s2: Number(s2.toFixed(5)),
    s3: Number(s3.toFixed(5)),
  };
}

export function marginRequired(params: {
  contractSize: number;
  lots: number;
  price: number;
  leverage: number;
}): number {
  const { contractSize, lots, price, leverage } = params;
  const notional = contractSize * lots * price;
  return Number((notional / leverage).toFixed(2));
}
