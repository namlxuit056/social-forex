-- CreateTable
CREATE TABLE "ScreenerLotConfig" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "lotSize" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenerLotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreenerLotConfig_symbol_key" ON "ScreenerLotConfig"("symbol");
