export type AiReviewTrendInput = {
  createdAt: string | Date;
  verdict: string;
  score: number;
};

export type VerdictCounts = {
  disciplined: number;
  acceptable: number;
  undisciplined: number;
};

export type AiReviewTrend = {
  sampleSize: number;
  overall: VerdictCounts;
  avgScore: number | null;
  undisciplinedRatePct: number | null;
  /** Nửa review gần đây nhất so với nửa trước đó (theo thời điểm review, không phải theo lệnh) —
   * null khi mỗi nửa chưa đủ MIN_HALF_SAMPLE để so sánh có ý nghĩa. */
  recentAvgScore: number | null;
  earlierAvgScore: number | null;
  /** recentAvgScore − earlierAvgScore — dương nghĩa là đang cải thiện */
  scoreTrendDelta: number | null;
  recentUndisciplinedRatePct: number | null;
};

/** Tổng số lệnh đã được AI review tối thiểu để card có ý nghĩa thống kê. */
export const MIN_SAMPLE = 5;
/** Mỗi nửa (gần đây / trước đó) cần tối thiểu ngần này để so sánh xu hướng. */
const MIN_HALF_SAMPLE = 3;

function isVerdict(v: string): v is keyof VerdictCounts {
  return v === "disciplined" || v === "acceptable" || v === "undisciplined";
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeAiReviewTrend(reviews: AiReviewTrendInput[]): AiReviewTrend {
  const sorted = [...reviews].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const overall: VerdictCounts = { disciplined: 0, acceptable: 0, undisciplined: 0 };
  const scores: number[] = [];
  for (const r of sorted) {
    if (isVerdict(r.verdict)) overall[r.verdict] += 1;
    if (Number.isFinite(r.score)) scores.push(r.score);
  }

  const sampleSize = sorted.length;
  const avgScore = mean(scores);
  const undisciplinedRatePct =
    sampleSize > 0 ? round1((overall.undisciplined / sampleSize) * 100) : null;

  const half = Math.floor(sorted.length / 2);
  const earlierHalf = sorted.slice(0, half);
  const recentHalf = sorted.slice(half);

  const hasTrend = earlierHalf.length >= MIN_HALF_SAMPLE && recentHalf.length >= MIN_HALF_SAMPLE;
  const earlierAvgScore = hasTrend ? mean(earlierHalf.map((r) => r.score)) : null;
  const recentAvgScore = hasTrend ? mean(recentHalf.map((r) => r.score)) : null;
  const recentUndisciplined = recentHalf.filter((r) => r.verdict === "undisciplined").length;
  const recentUndisciplinedRatePct = hasTrend
    ? round1((recentUndisciplined / recentHalf.length) * 100)
    : null;

  return {
    sampleSize,
    overall,
    avgScore: avgScore !== null ? round1(avgScore) : null,
    undisciplinedRatePct,
    recentAvgScore: recentAvgScore !== null ? round1(recentAvgScore) : null,
    earlierAvgScore: earlierAvgScore !== null ? round1(earlierAvgScore) : null,
    scoreTrendDelta:
      recentAvgScore !== null && earlierAvgScore !== null
        ? round1(recentAvgScore - earlierAvgScore)
        : null,
    recentUndisciplinedRatePct,
  };
}
