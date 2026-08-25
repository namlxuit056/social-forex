import { describe, expect, it } from "vitest";
import {
  computeBestPairSuggestion,
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

describe("computeBestPairSuggestion", () => {
  it("trả về symbol, session và setup tốt nhất khi đủ dữ liệu", () => {
    const trades: EdgeTrade[] = [
      ...Array.from({ length: 3 }, () =>
        trade({
          symbol: "EURUSD",
          result: "WIN",
          setup: "BREAKOUT",
          openedAt: "2026-07-15T08:00:00.000Z", // london
        }),
      ),
      ...Array.from({ length: 2 }, () =>
        trade({
          symbol: "EURUSD",
          result: "WIN",
          setup: "PULLBACK",
          openedAt: "2026-07-15T02:00:00.000Z", // asia
        }),
      ),
    ];
    const suggestion = computeBestPairSuggestion(trades);
    expect(suggestion?.symbol).toBe("EURUSD");
    expect(suggestion?.winRate).toBe(100);
    expect(suggestion?.total).toBe(5);
    expect(suggestion?.bestSession?.key).toBe("london");
    expect(suggestion?.bestSetup?.key).toBe("BREAKOUT");
  });

  it("trả null khi chưa đủ dữ liệu tổng thể", () => {
    const suggestion = computeBestPairSuggestion([trade({ symbol: "EURUSD", result: "WIN" })]);
    expect(suggestion).toBeNull();
  });

  it("đủ dữ liệu symbol nhưng chưa đủ dữ liệu session/setup con thì trả session/setup null", () => {
    const hours = [2, 8, 14, 3, 9];
    const trades: EdgeTrade[] = hours.map((h) =>
      trade({
        symbol: "EURUSD",
        result: "WIN",
        openedAt: `2026-07-15T${String(h).padStart(2, "0")}:00:00.000Z`,
      }),
    );
    const suggestion = computeBestPairSuggestion(trades);
    expect(suggestion?.symbol).toBe("EURUSD");
    expect(suggestion?.bestSession).toBeNull();
    expect(suggestion?.bestSetup).toBeNull();
  });
});
