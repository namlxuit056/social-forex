-- CreateTable
CREATE TABLE "AiTrendCache" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "trend" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTrendCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiTrendCache_symbol_locale_schemaVersion_key" ON "AiTrendCache"("symbol", "locale", "schemaVersion");

-- CreateIndex
CREATE INDEX "AiTrendCache_expiresAt_idx" ON "AiTrendCache"("expiresAt");
