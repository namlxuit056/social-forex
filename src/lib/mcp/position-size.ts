import { marginRequired, contractSize, positionSizeLots, stopLossPips } from "@/lib/calculators";

/** Đồng quote theo cách `positionSizeLots` hiểu — tài khoản giả định bằng USD. */
export function quoteKind(symbol: string): "USD" | "JPY" | "other" {
  const s = symbol.toUpperCase();
  if (s.endsWith("JPY")) return "JPY";
  if (s.endsWith("USD")) return "USD";
  return "other";
}

export function computePositionSize(params: {
  symbol: string;
  balance: number;
  riskPct: number;
  entry: number;
  stopLoss: number;
  leverage?: number;
}) {
  const symbol = params.symbol.toUpperCase();
  const slPips = stopLossPips({ symbol, entry: params.entry, stopLoss: params.stopLoss });
  const quote = quoteKind(symbol);
  const size = positionSizeLots({
    balance: params.balance,
    riskPct: params.riskPct,
    stopLossPips: slPips,
    symbol,
    price: params.entry,
    quote,
  });

  const margin =
    params.leverage && size.lots > 0
      ? marginRequired({
          contractSize: contractSize(symbol),
          lots: size.lots,
          // USD là base (USDJPY, USDCAD…) → giá trị hợp đồng đã tính bằng USD.
          price: symbol.startsWith("USD") ? 1 : params.entry,
          leverage: params.leverage,
        })
      : null;

  return {
    symbol,
    accountCurrency: "USD",
    stopLossPips: slPips,
    lots: size.lots,
    riskAmount: size.riskAmount,
    pipValuePerLot: size.pipValuePerLot,
    marginRequired: margin,
    notes: [
      ...(quote === "other"
        ? ["Quote currency is not USD/JPY — pip value is approximated as if quoted in USD."]
        : []),
      ...(size.lots === 0 ? ["Inputs are invalid or the stop loss is zero — no size computed."] : []),
    ],
  };
}
