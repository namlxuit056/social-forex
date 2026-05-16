import { describe, expect, it } from "vitest";
import { detectAdvisorSymbols } from "@/lib/ai/advisor";

describe("detectAdvisorSymbols", () => {
  it("detects supported symbols mentioned in chat history", () => {
    expect(
      detectAdvisorSymbols([
        { role: "user", content: "Can you review my XAUUSD and EUR/USD plan?" },
      ]),
    ).toEqual(expect.arrayContaining(["XAUUSD", "EURUSD"]));
  });

  it("maps common market aliases to symbols", () => {
    expect(
      detectAdvisorSymbols([
        { role: "user", content: "Giá vàng và xu hướng bitcoin hôm nay?" },
      ]),
    ).toEqual(expect.arrayContaining(["XAUUSD", "BTCUSD"]));
  });

  it("ignores unsupported free text", () => {
    expect(
      detectAdvisorSymbols([
        { role: "user", content: "How should I manage risk today?" },
      ]),
    ).toHaveLength(0);
  });
});
