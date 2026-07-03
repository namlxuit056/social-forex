-- AlterTable: Mt5Command gains a TTL and a distance field for live-recomputed trailing stops
ALTER TABLE "Mt5Command" ADD COLUMN "trailDistancePips" DOUBLE PRECISION;
ALTER TABLE "Mt5Command" ADD COLUMN "expiresAt" TIMESTAMP(3);
