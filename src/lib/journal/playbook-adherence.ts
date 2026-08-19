export type PlaybookTrade = {
  result: string;
  setup?: string | null;
};

export type PlaybookGroupStats = {
  total: number;
  wins: number;
  losses: number;
  /** % thua trong số lệnh W/L — null khi < 2 lệnh W/L */
  lossRate: number | null;
};

export type PlaybookAdherenceStats = {
  onPlaybook: PlaybookGroupStats;
  offPlaybook: PlaybookGroupStats;
};

function buildGroup(trades: PlaybookTrade[]): PlaybookGroupStats {
  const closed = trades.filter(
    (t) => t.result === "WIN" || t.result === "LOSS" || t.result === "BREAKEVEN",
  );
  const wins = closed.filter((t) => t.result === "WIN").length;
  const losses = closed.filter((t) => t.result === "LOSS").length;
  return {
    total: closed.length,
    wins,
    losses,
    lossRate: wins + losses >= 2 ? Math.round((losses / (wins + losses)) * 1000) / 10 : null,
  };
}

/**
 * So tỷ lệ thua giữa lệnh khớp setup tốt nhất (onPlaybook) và lệnh không khớp
 * (offPlaybook, gồm cả lệnh chưa gắn setup) — đóng vòng lặp cho gợi ý setup playbook
 * match trong journal-form.
 */
export function computePlaybookAdherence(
  trades: PlaybookTrade[],
  bestSetup: string,
): PlaybookAdherenceStats {
  const onPlaybook: PlaybookTrade[] = [];
  const offPlaybook: PlaybookTrade[] = [];
  for (const t of trades) {
    (t.setup === bestSetup ? onPlaybook : offPlaybook).push(t);
  }
  return {
    onPlaybook: buildGroup(onPlaybook),
    offPlaybook: buildGroup(offPlaybook),
  };
}
