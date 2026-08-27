import { realizedR, type RTrade } from "./r-multiple";

export type RBucket = {
  key: string;
  label: string;
  /** exclusive lower bound; null = -∞ */
  min: number | null;
  /** inclusive upper bound; null = +∞ */
  max: number | null;
  count: number;
  win: boolean;
};

const BUCKET_DEFS: Omit<RBucket, "count">[] = [
  { key: "lt-2", label: "< -2R", min: null, max: -2, win: false },
  { key: "-2to-1", label: "-2R…-1R", min: -2, max: -1, win: false },
  { key: "-1to0", label: "-1R…0", min: -1, max: 0, win: false },
  { key: "0to1", label: "0…1R", min: 0, max: 1, win: true },
  { key: "1to2", label: "1R…2R", min: 1, max: 2, win: true },
  { key: "gt2", label: "> 2R", min: 2, max: null, win: true },
];

export type RDistribution = {
  buckets: RBucket[];
  /** trades with a computable realized R */
  total: number;
};

/**
 * Phân phối realized-R của các lệnh đã đóng theo bucket cố định
 * (<-2R, -2..-1R, -1..0, 0..1R, 1..2R, >2R). Pure — dùng cho histogram tab Thống kê.
 * Quy ước bucket: min < r <= max (0 rơi vào -1..0, đúng 1R rơi vào 0..1R).
 */
export function computeRMultipleDistribution(trades: RTrade[]): RDistribution {
  const buckets: RBucket[] = BUCKET_DEFS.map((d) => ({ ...d, count: 0 }));
  let total = 0;

  for (const trade of trades) {
    if (
      trade.result !== "WIN" &&
      trade.result !== "LOSS" &&
      trade.result !== "BREAKEVEN"
    ) {
      continue;
    }
    const r = realizedR(trade);
    if (r === null) continue;
    total += 1;

    const bucket = buckets.find((b) => {
      const aboveMin = b.min === null ? true : r > b.min;
      const belowMax = b.max === null ? true : r <= b.max;
      return aboveMin && belowMax;
    });
    if (bucket) bucket.count += 1;
  }

  return { buckets, total };
}
