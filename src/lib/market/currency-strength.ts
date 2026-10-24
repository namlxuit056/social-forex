/** Sức mạnh tương đối 8 đồng tiền chính, suy ra từ % thay đổi trong ngày của các cặp có sẵn. */

export const STRENGTH_CURRENCIES = ["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "NZD"] as const;

export type StrengthCurrency = (typeof STRENGTH_CURRENCIES)[number];

type ChangeQuote = { symbol: string; changePct: number };

/** Điểm sức mạnh mỗi đồng = trung bình % thay đổi của nó so với các đồng còn lại (cặp đảo thì đổi dấu). */
export function currencyStrengthScores(quotes: ChangeQuote[]): Map<StrengthCurrency, number> {
  const changeMap = new Map<string, number>();
  for (const q of quotes) {
    changeMap.set(q.symbol.replace("/", ""), q.changePct);
  }

  const strength = new Map<StrengthCurrency, number>();
  for (const c of STRENGTH_CURRENCIES) {
    let total = 0;
    let count = 0;
    for (const other of STRENGTH_CURRENCIES) {
      if (c === other) continue;
      const pair = `${c}${other}`;
      const inv = `${other}${c}`;
      if (changeMap.has(pair)) {
        total += changeMap.get(pair)!;
        count++;
      } else if (changeMap.has(inv)) {
        total -= changeMap.get(inv)!;
        count++;
      }
    }
    strength.set(c, count > 0 ? total / count : 0);
  }
  return strength;
}

/** Ma trận base × quote, giá trị 0..1 (0.5 = cân bằng, > 0.5 = base mạnh hơn quote). */
export function buildStrengthMatrix(quotes: ChangeQuote[]) {
  const strength = currencyStrengthScores(quotes);

  return STRENGTH_CURRENCIES.map((base) => ({
    base,
    values: STRENGTH_CURRENCIES.map((quote) => {
      if (base === quote) return null;
      const diff = (strength.get(base) ?? 0) - (strength.get(quote) ?? 0);
      return Math.round(Math.max(0, Math.min(1, 0.5 + diff * 5)) * 100) / 100;
    }),
  }));
}
