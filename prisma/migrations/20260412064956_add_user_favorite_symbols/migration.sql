-- CreateTable
CREATE TABLE "UserFavoriteSymbol" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFavoriteSymbol_userId_sortOrder_idx" ON "UserFavoriteSymbol"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteSymbol_userId_symbol_key" ON "UserFavoriteSymbol"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "UserFavoriteSymbol" ADD CONSTRAINT "UserFavoriteSymbol_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
