-- CreateTable
CREATE TABLE "AiModelSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'deepseek',
    "model" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModelSetting_pkey" PRIMARY KEY ("id")
);
