-- Risk $ committed by a trade at the moment it is logged / queued, so the daily
-- maxRiskPercent budget can be re-summed without guessing at historical prices.
-- TradeJournal: computed from entry/SL/lotSize when all present.
-- Mt5Command: computed from reference price / resolved SL / volume for PLACE_* commands.
ALTER TABLE "TradeJournal" ADD COLUMN "riskAmount" DOUBLE PRECISION;
ALTER TABLE "Mt5Command" ADD COLUMN "riskAmount" DOUBLE PRECISION;
