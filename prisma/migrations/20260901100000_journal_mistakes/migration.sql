-- Self-reported process mistake tags per trade (cost-of-mistakes ranking).
ALTER TABLE "TradeJournal" ADD COLUMN "mistakes" TEXT[] NOT NULL DEFAULT '{}';
