-- CreateTable
CREATE TABLE "CompoundGrowthPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startingCapital" DOUBLE PRECISION NOT NULL,
    "targetCapital" DOUBLE PRECISION NOT NULL,
    "dailyTargetPercent" DOUBLE PRECISION NOT NULL,
    "dailyStopPercent" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompoundGrowthPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompoundGrowthPlan_userId_key" ON "CompoundGrowthPlan"("userId");

-- AddForeignKey
ALTER TABLE "CompoundGrowthPlan" ADD CONSTRAINT "CompoundGrowthPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
