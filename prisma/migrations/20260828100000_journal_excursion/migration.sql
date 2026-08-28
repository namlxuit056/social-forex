-- MAE/MFE (max adverse/favorable excursion) for MT5-linked trades.
ALTER TABLE "Mt5SignalLink" ADD COLUMN "maeProfit" DOUBLE PRECISION;
ALTER TABLE "Mt5SignalLink" ADD COLUMN "mfeProfit" DOUBLE PRECISION;

ALTER TABLE "TradeJournal" ADD COLUMN "maeProfit" DOUBLE PRECISION;
ALTER TABLE "TradeJournal" ADD COLUMN "mfeProfit" DOUBLE PRECISION;
