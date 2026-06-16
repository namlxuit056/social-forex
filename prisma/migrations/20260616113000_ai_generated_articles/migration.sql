CREATE TYPE "AiArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "AiArticleAutomationSetting" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "autoPublish" BOOLEAN NOT NULL DEFAULT false,
  "locale" TEXT NOT NULL DEFAULT 'vi',
  "seedKeywords" TEXT[] NOT NULL DEFAULT ARRAY['forex', 'XAUUSD', 'gold trading', 'EURUSD', 'forex news']::TEXT[],
  "maxArticlesPerDay" INTEGER NOT NULL DEFAULT 1,
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiArticleAutomationSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiGeneratedArticle" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'vi',
  "keyword" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "metaDescription" TEXT NOT NULL,
  "status" "AiArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "trendSource" TEXT,
  "sourceKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiGeneratedArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiGeneratedArticle_locale_slug_key" ON "AiGeneratedArticle"("locale", "slug");
CREATE INDEX "AiGeneratedArticle_locale_status_publishedAt_idx" ON "AiGeneratedArticle"("locale", "status", "publishedAt");
CREATE INDEX "AiGeneratedArticle_keyword_generatedAt_idx" ON "AiGeneratedArticle"("keyword", "generatedAt");
