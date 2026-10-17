import { describe, expect, it } from "vitest";
import {
  IMPACT_TONE,
  directionTone,
  normalizeDirection,
  normalizeImpact,
  signalStatusTone,
  tierTone,
} from "./status-map";

describe("status-map", () => {
  it("maps signal statuses to tones", () => {
    expect(signalStatusTone("CLOSED_WIN")).toBe("success");
    expect(signalStatusTone("CLOSED_LOSS")).toBe("danger");
    expect(signalStatusTone("PENDING")).toBe("warning");
    expect(signalStatusTone("ACTIVE")).toBe("info");
    expect(signalStatusTone("SOMETHING_NEW")).toBe("neutral");
  });

  it("normalizes journal and MT5 directions", () => {
    expect(normalizeDirection("LONG")).toBe("long");
    expect(normalizeDirection("buy_limit")).toBe("long");
    expect(normalizeDirection("SELL")).toBe("short");
    expect(normalizeDirection(" short ")).toBe("short");
    expect(normalizeDirection("")).toBeNull();
    expect(directionTone("BUY")).toBe("success");
    expect(directionTone("SHORT")).toBe("danger");
    expect(directionTone(null)).toBe("neutral");
  });

  it("normalizes impact strings", () => {
    expect(normalizeImpact("High Impact Expected")).toBe("high");
    expect(normalizeImpact("low")).toBe("low");
    expect(normalizeImpact("Medium")).toBe("medium");
    expect(normalizeImpact(undefined)).toBe("medium");
    expect(IMPACT_TONE.high).toBe("danger");
  });

  it("highlights VIP tier only", () => {
    expect(tierTone("VIP")).toBe("primary");
    expect(tierTone("FREE")).toBe("neutral");
  });
});
