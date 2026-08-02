-- CreateTable
CREATE TABLE "CopyTradeReview" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopyTradeReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CopyTradeReview_providerId_hidden_idx" ON "CopyTradeReview"("providerId", "hidden");

-- CreateIndex
CREATE UNIQUE INDEX "CopyTradeReview_reviewerId_providerId_key" ON "CopyTradeReview"("reviewerId", "providerId");

-- AddForeignKey
ALTER TABLE "CopyTradeReview" ADD CONSTRAINT "CopyTradeReview_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyTradeReview" ADD CONSTRAINT "CopyTradeReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ForumReport" ADD COLUMN "copyTradeReviewId" TEXT;

-- CreateIndex
CREATE INDEX "ForumReport_copyTradeReviewId_idx" ON "ForumReport"("copyTradeReviewId");

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_copyTradeReviewId_fkey" FOREIGN KEY ("copyTradeReviewId") REFERENCES "CopyTradeReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
