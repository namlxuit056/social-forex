import { describe, expect, it } from "vitest";
import { adxRegime, bbPosition, stochState } from "./scalping-tradingview-context";

describe("bbPosition", () => {
  it("flags price above the upper band / below the lower band", () => {
    expect(bbPosition(110, 105, 95, 100)).toBe("above upper band");
    expect(bbPosition(90, 105, 95, 100)).toBe("below lower band");
  });

  it("splits the band into upper / lower half around the basis", () => {
    expect(bbPosition(102, 105, 95, 100)).toBe("upper half");
    expect(bbPosition(98, 105, 95, 100)).toBe("lower half");
    expect(bbPosition(100, 105, 95, 100)).toBe("upper half"); // == basis → upper
  });

  it("returns unknown when any input is null", () => {
    expect(bbPosition(null, 105, 95, 100)).toBe("unknown");
    expect(bbPosition(100, 105, 95, null)).toBe("unknown");
  });
});

describe("stochState", () => {
  it("marks >=80 overbought and <=20 oversold", () => {
    expect(stochState(85)).toBe("overbought");
    expect(stochState(80)).toBe("overbought");
    expect(stochState(15)).toBe("oversold");
    expect(stochState(20)).toBe("oversold");
    expect(stochState(50)).toBe("neutral");
    expect(stochState(null)).toBe("neutral");
  });
});

describe("adxRegime", () => {
  it("is ranging when ADX is low or DI lines are intertwined", () => {
    expect(adxRegime(12, 25, 20, )).toBe("ranging / no trend");
    expect(adxRegime(30, 22, 20)).toBe("ranging / no trend"); // separation 2 < 4
  });

  it("distinguishes strong vs weak trend by ADX level and direction by DI", () => {
    expect(adxRegime(28, 30, 15)).toBe("strong uptrend");
    expect(adxRegime(28, 15, 30)).toBe("strong downtrend");
    expect(adxRegime(20, 28, 15)).toBe("weak uptrend");
    expect(adxRegime(20, 15, 28)).toBe("weak downtrend");
  });

  it("returns unknown when a value is missing", () => {
    expect(adxRegime(null, 25, 15)).toBe("unknown");
    expect(adxRegime(25, null, 15)).toBe("unknown");
  });
});
