import { describe, expect, it } from "vitest";
import { classifyDiaryMood, computeEmotionDiaryCorrelation } from "./emotion-diary-correlation";

describe("classifyDiaryMood", () => {
  it("nhận diện tâm trạng tiêu cực có dấu", () => {
    expect(classifyDiaryMood("Hôm nay khá mệt mỏi và áp lực vì tin NFP")).toBe("negative");
  });

  it("nhận diện tâm trạng tiêu cực không dấu", () => {
    expect(classifyDiaryMood("hom nay met moi qua")).toBe("negative");
  });

  it("nhận diện tâm trạng tích cực", () => {
    expect(classifyDiaryMood("Cảm thấy tự tin và bình tĩnh trước phiên London")).toBe("positive");
  });

  it("trả neutral khi note không chứa từ khoá nào", () => {
    expect(classifyDiaryMood("Vào lệnh EURUSD theo kế hoạch đã đặt ra")).toBe("neutral");
  });

  it("ưu tiên tiêu cực khi note chứa cả 2 loại từ khoá (không tập trung)", () => {
    expect(classifyDiaryMood("Hôm nay không tập trung, dễ FOMO")).toBe("negative");
  });

  it("không match nhầm cụm chứa 'so' (vd 'so với hôm qua') — không có từ khoá nào khớp nên trả neutral", () => {
    expect(classifyDiaryMood("Kết quả khá hơn so với hôm qua")).toBe("neutral");
  });
});

describe("computeEmotionDiaryCorrelation", () => {
  it("trả về 0 ngày khi không có entry nào", () => {
    const stats = computeEmotionDiaryCorrelation([], []);
    expect(stats).toEqual({
      negativeDays: 0,
      positiveDays: 0,
      neutralDays: 0,
      negative: { total: 0, wins: 0, losses: 0, winRate: null },
      nonNegative: { total: 0, wins: 0, losses: 0, winRate: null },
    });
  });

  it("phân loại đúng số ngày theo tâm trạng", () => {
    const stats = computeEmotionDiaryCorrelation(
      [
        { date: "2026-08-01T00:00:00.000Z", note: "met moi qua" },
        { date: "2026-08-02T00:00:00.000Z", note: "tu tin, binh tinh" },
        { date: "2026-08-03T00:00:00.000Z", note: "vao lenh theo ke hoach" },
      ],
      [],
    );
    expect(stats.negativeDays).toBe(1);
    expect(stats.positiveDays).toBe(1);
    expect(stats.neutralDays).toBe(1);
  });

  it("gom lệnh log trong ngày vào đúng nhóm negative/nonNegative", () => {
    const stats = computeEmotionDiaryCorrelation(
      [
        { date: "2026-08-01T00:00:00.000Z", note: "stress qua" },
        { date: "2026-08-02T00:00:00.000Z", note: "binh tinh, tu tin" },
      ],
      [
        { openedAt: "2026-08-01T02:00:00.000Z", result: "LOSS" },
        { openedAt: "2026-08-01T10:00:00.000Z", result: "LOSS" },
        { openedAt: "2026-08-02T02:00:00.000Z", result: "WIN" },
        { openedAt: "2026-08-02T10:00:00.000Z", result: "WIN" },
      ],
    );
    expect(stats.negative).toEqual({ total: 2, wins: 0, losses: 2, winRate: 0 });
    expect(stats.nonNegative).toEqual({ total: 2, wins: 2, losses: 0, winRate: 100 });
  });

  it("winRate null khi nhóm có dưới 2 lệnh W/L", () => {
    const stats = computeEmotionDiaryCorrelation(
      [{ date: "2026-08-01T00:00:00.000Z", note: "stress qua" }],
      [{ openedAt: "2026-08-01T02:00:00.000Z", result: "LOSS" }],
    );
    expect(stats.negative.winRate).toBeNull();
  });

  it("chỉ gom lệnh đúng ngày, không lẫn ngày khác", () => {
    const stats = computeEmotionDiaryCorrelation(
      [{ date: "2026-08-01T00:00:00.000Z", note: "stress qua" }],
      [
        { openedAt: "2026-08-01T02:00:00.000Z", result: "WIN" },
        { openedAt: "2026-08-02T02:00:00.000Z", result: "LOSS" },
      ],
    );
    expect(stats.negative.total).toBe(1);
  });
});
