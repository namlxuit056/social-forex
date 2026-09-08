import { describe, it, expect } from "vitest";
import {
  classifyCrowd,
  classifyCot,
  crossSignal,
  CROWD_EXTREME_PCT,
} from "./external-signal-classify";

describe("classifyCrowd (ngược đám đông)", () => {
  it("đám đông long cực đoan → BÁN", () => {
    expect(classifyCrowd(CROWD_EXTREME_PCT)).toBe("sell");
    expect(classifyCrowd(80)).toBe("sell");
  });

  it("đám đông short cực đoan → MUA", () => {
    expect(classifyCrowd(100 - CROWD_EXTREME_PCT)).toBe("buy");
    expect(classifyCrowd(20)).toBe("buy");
  });

  it("chưa lệch đủ mạnh → không tín hiệu", () => {
    expect(classifyCrowd(50)).toBeNull();
    expect(classifyCrowd(60)).toBeNull();
  });

  it("giá trị không hợp lệ → null", () => {
    expect(classifyCrowd(NaN)).toBeNull();
  });
});

describe("classifyCot (đi theo quỹ lớn)", () => {
  it("ròng lớn + mở rộng trong tuần → theo chiều", () => {
    expect(classifyCot(12, 5000)).toBe("buy");
    expect(classifyCot(-12, -5000)).toBe("sell");
  });

  it("ròng lớn nhưng tuần này thu hẹp → không tín hiệu", () => {
    expect(classifyCot(12, -5000)).toBeNull();
  });

  it("ròng rất lớn → phát kể cả khi tuần này thu hẹp", () => {
    expect(classifyCot(25, -1000)).toBe("buy");
  });

  it("ròng nhỏ → không tín hiệu", () => {
    expect(classifyCot(3, 9999)).toBeNull();
  });
});

describe("crossSignal (cặp chéo)", () => {
  it("base mạnh, quote yếu → MUA cặp", () => {
    expect(crossSignal("buy", "sell")).toBe("buy");
  });
  it("base yếu, quote mạnh → BÁN cặp", () => {
    expect(crossSignal("sell", "buy")).toBe("sell");
  });
  it("cùng chiều hoặc thiếu dữ liệu → null", () => {
    expect(crossSignal("buy", "buy")).toBeNull();
    expect(crossSignal("buy", null)).toBeNull();
    expect(crossSignal(null, null)).toBeNull();
  });
});
