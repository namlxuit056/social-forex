-- AlterTable: add symbol/volume/price columns to Mt5Command for PLACE_* order commands
ALTER TABLE "Mt5Command" ADD COLUMN "symbol" TEXT;
ALTER TABLE "Mt5Command" ADD COLUMN "volume" DOUBLE PRECISION;
ALTER TABLE "Mt5Command" ADD COLUMN "price" DOUBLE PRECISION;
