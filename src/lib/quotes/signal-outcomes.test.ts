import { describe, expect, it } from "vitest";
import {
  classifyOutcome,
  computeSourceScorecard,
  FLAT_BAND_PCT,
  type OutcomeRow,
} from "@/lib/quotes/signal-outcomes";

describe("classifyOutcome", () => {
  it("buy: giá tăng đủ ngưỡng = win, favorPct dương", () => {
    const { result, favorPct } = classifyOutcome("buy", 100, 102);
    expect(result).toBe("win");
    expect(favorPct).toBeCloseTo(2);
  });

  it("buy: giá giảm = loss, favorPct âm", () => {
    const { result, favorPct } = classifyOutcome("buy", 100, 98.5);
    expect(result).toBe("loss");
    expect(favorPct).toBeCloseTo(-1.5);
  });

  it("sell: giá giảm = win (favorPct đảo dấu so với biến động thô)", () => {
    const { result, favorPct } = classifyOutcome("sell", 200, 196);
    expect(result).toBe("win");
    expect(favorPct).toBeCloseTo(2);
  });

  it("sell: giá tăng = loss", () => {
    const { result } = classifyOutcome("sell", 200, 203);
    expect(result).toBe("loss");
  });

  it("biến động dưới FLAT_BAND_PCT = flat", () => {
    const tiny = 100 * (FLAT_BAND_PCT / 100) * 0.5;
    expect(classifyOutcome("buy", 100, 100 + tiny).result).toBe("flat");
    expect(classifyOutcome("sell", 100, 100 - tiny).result).toBe("flat");
  });
});

function row(over: Partial<OutcomeRow>): OutcomeRow {
  return {
    source: "tradingview",
    firedAt: new Date("2026-09-01T00:00:00Z"),
    result: "win",
    favorPct: 1,
    ...over,
  };
}

describe("computeSourceScorecard", () => {
  const now = new Date("2026-09-10T00:00:00Z");

  it("luôn trả đủ 5 nguồn kể cả khi rỗng", () => {
    const card = computeSourceScorecard([], { now, windowDays: 30 });
    expect(card.sources.map((s) => s.source).sort()).toEqual(
      ["cot", "igDailyfx", "myfxbook", "oandaBook", "tradingview"].sort(),
    );
    expect(card.sources.every((s) => s.winRate === null && s.evaluated === 0)).toBe(true);
  });

  it("winRate = wins / (wins + losses), flats không nằm ở mẫu số", () => {
    const rows: OutcomeRow[] = [
      row({ result: "win", favorPct: 2 }),
      row({ result: "win", favorPct: 1 }),
      row({ result: "loss", favorPct: -1 }),
      row({ result: "flat", favorPct: 0.02 }),
    ];
    const tv = computeSourceScorecard(rows, { now, windowDays: 30 }).sources.find(
      (s) => s.source === "tradingview",
    )!;
    expect(tv.wins).toBe(2);
    expect(tv.losses).toBe(1);
    expect(tv.flats).toBe(1);
    expect(tv.winRate).toBeCloseTo(2 / 3);
    expect(tv.evaluated).toBe(4);
    expect(tv.avgFavorPct).toBeCloseTo((2 + 1 - 1 + 0.02) / 4);
  });

  it("đếm pending riêng, không tính vào evaluated", () => {
    const rows: OutcomeRow[] = [
      row({ result: null, favorPct: null }),
      row({ result: "win", favorPct: 1 }),
    ];
    const tv = computeSourceScorecard(rows, { now, windowDays: 30 }).sources.find(
      (s) => s.source === "tradingview",
    )!;
    expect(tv.pending).toBe(1);
    expect(tv.evaluated).toBe(1);
  });

  it("lọc theo firedAt trong windowDays", () => {
    const rows: OutcomeRow[] = [
      row({ firedAt: new Date("2026-09-09T00:00:00Z"), result: "win" }),
      row({ firedAt: new Date("2026-07-01T00:00:00Z"), result: "loss" }),
    ];
    const tv30 = computeSourceScorecard(rows, { now, windowDays: 30 }).sources.find(
      (s) => s.source === "tradingview",
    )!;
    expect(tv30.evaluated).toBe(1);
    expect(tv30.wins).toBe(1);

    const tv90 = computeSourceScorecard(rows, { now, windowDays: 90 }).sources.find(
      (s) => s.source === "tradingview",
    )!;
    expect(tv90.evaluated).toBe(2);
  });

  it("winRate null khi mọi tín hiệu đã chấm đều flat", () => {
    const rows: OutcomeRow[] = [row({ result: "flat", favorPct: 0.01 })];
    const tv = computeSourceScorecard(rows, { now, windowDays: 30 }).sources.find(
      (s) => s.source === "tradingview",
    )!;
    expect(tv.winRate).toBeNull();
    expect(tv.avgFavorPct).toBeCloseTo(0.01);
  });
});
