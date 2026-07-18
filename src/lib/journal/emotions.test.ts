import { describe, expect, it } from "vitest";
import { parseJournalImageUrl, parseTradeEmotion } from "./emotions";

describe("parseTradeEmotion", () => {
  it("nhận giá trị hợp lệ, trả null cho giá trị lạ", () => {
    expect(parseTradeEmotion("FOMO")).toBe("FOMO");
    expect(parseTradeEmotion("CALM")).toBe("CALM");
    expect(parseTradeEmotion("")).toBeNull();
    expect(parseTradeEmotion("HACKED")).toBeNull();
    expect(parseTradeEmotion(null)).toBeNull();
    expect(parseTradeEmotion(42)).toBeNull();
  });
});

describe("parseJournalImageUrl", () => {
  it("chỉ nhận https URL độ dài hợp lý", () => {
    expect(parseJournalImageUrl("https://blob.vercel.com/x.jpg")).toBe(
      "https://blob.vercel.com/x.jpg",
    );
    expect(parseJournalImageUrl("http://insecure.com/x.jpg")).toBeNull();
    expect(parseJournalImageUrl("javascript:alert(1)")).toBeNull();
    expect(parseJournalImageUrl("")).toBeNull();
    expect(parseJournalImageUrl(`https://a.com/${"x".repeat(600)}`)).toBeNull();
    expect(parseJournalImageUrl(null)).toBeNull();
  });
});
