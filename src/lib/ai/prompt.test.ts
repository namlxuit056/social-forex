import { describe, expect, it } from "vitest";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import type { QuoteRow } from "@/lib/quotes/types";

const quote: QuoteRow = {
  symbol: "EURUSD",
  name: "Euro / US Dollar",
  group: "major",
  bid: 1.0842,
  ask: 1.08435,
  changePct: 0.12,
};

describe("AI prompt language", () => {
  it("does not hardcode Vietnamese in the system prompt schema", () => {
    expect(SYSTEM_PROMPT).not.toContain("Vietnamese");
    expect(SYSTEM_PROMPT).toContain("requested response language");
  });

  it("requests English output for English locale", () => {
    const prompt = buildUserPrompt(quote, null, null, "en");

    expect(prompt).toContain("Response language: English");
    expect(prompt).toContain("Do not use Vietnamese");
    expect(prompt).not.toContain("in Vietnamese");
  });

  it("requests Vietnamese output for Vietnamese locale", () => {
    const prompt = buildUserPrompt(quote, null, null, "vi");

    expect(prompt).toContain("Response language: Vietnamese.");
  });
});
