import { describe, expect, it } from "vitest";
import {
  computeEdgeGroups,
  findBestRow,
  findWorstRow,
  sessionOfUtcHour,
  type EdgeTrade,
} from "./edge-stats";

function trade(overrides: Partial<EdgeTrade>): EdgeTrade {
  return {
    symbol: "XAUUSD",
    direction: "LONG",
    result: "WIN",
    pnl: 10,
    openedAt: "2026-07-15T08:00:00.000Z",
    copiedFromSignalId: null,
    ...overrides,
  };
}

describe("sessionOfUtcHour", () => {
  it("phân 24h thành đúng 3 phiên không chồng lấn", () => {
    expect(sessionOfUtcHour(23)).toBe("asia");
    expect(sessionOfUtcHour(0)).toBe("asia");
    expect(sessionOfUtcHour(6)).toBe("asia");
    expect(sessionOfUtcHour(7)).toBe("london");
    expect(sessionOfUtcHour(12)).toBe("london");
    expect(sessionOfUtcHour(13)).toBe("newyork");
    expect(sessionOfUtcHour(21)).toBe("newyork");
    expect(sessionOfUtcHour(22)).toBe("asia");
  });
});

describe("computeEdgeGroups", () => {
  it("bỏ qua lệnh PENDING và tính winRate theo W/L", () => {
    const groups = computeEdgeGroups([
      trade({ result: "WIN" }),
      trade({ result: "LOSS", pnl: -5 }),
      trade({ result: "PENDING", pnl: null }),
      trade({ result: "BREAKEVEN", pnl: 0 }),
    ]);
    expect(groups.symbols).toHaveLength(1);
    const row = groups.symbols[0];
    expect(row.key).toBe("XAUUSD");
    expect(row.total).toBe(3);
    expect(row.wins).toBe(1);
    expect(row.losses).toBe(1);
    expect(row.winRate).toBe(50);
    expect(row.pnl).toBe(5);
  });

  it("không hiện winRate khi nhóm có < 2 lệnh W/L", () => {
    const groups = computeEdgeGroups([trade({ result: "WIN" })]);
    expect(groups.symbols[0].winRate).toBeNull();
  });

  it("nhóm theo setup, bỏ lệnh chưa gắn setup", () => {
    const groups = computeEdgeGroups([
      trade({ setup: "BREAKOUT" }),
      trade({ setup: "BREAKOUT", result: "LOSS" }),
      trade({ setup: null }),
      trade({}),
    ]);
    expect(groups.setups).toHaveLength(1);
    expect(groups.setups[0].key).toBe("BREAKOUT");
    expect(groups.setups[0].total).toBe(2);
  });

  it("tách nguồn lệnh manual vs signal", () => {
    const groups = computeEdgeGroups([
      trade({}),
      trade({ copiedFromSignalId: "sig1", result: "LOSS" }),
    ]);
    const keys = groups.sources.map((r) => r.key).sort();
    expect(keys).toEqual(["manual", "signal"]);
  });
});

describe("findWorstRow", () => {
  it("chọn nhóm winRate thấp nhất có đủ số lệnh", () => {
    const trades: EdgeTrade[] = [
      ...Array.from({ length: 5 }, () => trade({ symbol: "EURUSD", result: "LOSS", pnl: -10 })),
      ...Array.from({ length: 5 }, () => trade({ symbol: "XAUUSD", result: "WIN" })),
    ];
    const worst = findWorstRow(computeEdgeGroups(trades).symbols, 5);
    expect(worst?.key).toBe("EURUSD");
    expect(worst?.winRate).toBe(0);
  });

  it("trả null khi không nhóm nào đủ lệnh", () => {
    const worst = findWorstRow(computeEdgeGroups([trade({})]).symbols, 5);
    expect(worst).toBeNull();
  });
});

describe("findBestRow", () => {
  it("chọn nhóm winRate cao nhất có đủ số lệnh", () => {
    const trades: EdgeTrade[] = [
      ...Array.from({ length: 5 }, () => trade({ setup: "BREAKOUT", result: "LOSS", pnl: -10 })),
      ...Array.from({ length: 5 }, () => trade({ setup: "PULLBACK", result: "WIN" })),
    ];
    const best = findBestRow(computeEdgeGroups(trades).setups, 5);
    expect(best?.key).toBe("PULLBACK");
    expect(best?.winRate).toBe(100);
  });

  it("trả null khi không nhóm nào đủ lệnh", () => {
    const best = findBestRow(computeEdgeGroups([trade({ setup: "BREAKOUT" })]).setups, 5);
    expect(best).toBeNull();
  });
});
