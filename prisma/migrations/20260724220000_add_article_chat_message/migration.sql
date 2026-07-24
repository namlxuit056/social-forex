-- CreateTable
CREATE TABLE "ArticleChatMessage" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleChatMessage_articleId_userId_createdAt_idx" ON "ArticleChatMessage"("articleId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ArticleChatMessage" ADD CONSTRAINT "ArticleChatMessage_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "AiGeneratedArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleChatMessage" ADD CONSTRAINT "ArticleChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
