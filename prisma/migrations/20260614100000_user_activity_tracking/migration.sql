CREATE TYPE "ClientErrorKind" AS ENUM ('ERROR_BOUNDARY', 'GLOBAL_ERROR', 'UNHANDLED_REJECTION');

CREATE TABLE "UserPageVisit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "fullPath" TEXT NOT NULL,
    "title" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPageVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserClientError" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "fullPath" TEXT,
    "kind" "ClientErrorKind" NOT NULL DEFAULT 'GLOBAL_ERROR',
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "digest" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserClientError_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserPageVisit_userId_createdAt_idx" ON "UserPageVisit"("userId", "createdAt");
CREATE INDEX "UserPageVisit_path_createdAt_idx" ON "UserPageVisit"("path", "createdAt");
CREATE INDEX "UserPageVisit_createdAt_idx" ON "UserPageVisit"("createdAt");

CREATE INDEX "UserClientError_userId_createdAt_idx" ON "UserClientError"("userId", "createdAt");
CREATE INDEX "UserClientError_path_createdAt_idx" ON "UserClientError"("path", "createdAt");
CREATE INDEX "UserClientError_kind_createdAt_idx" ON "UserClientError"("kind", "createdAt");
CREATE INDEX "UserClientError_createdAt_idx" ON "UserClientError"("createdAt");

ALTER TABLE "UserPageVisit" ADD CONSTRAINT "UserPageVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserClientError" ADD CONSTRAINT "UserClientError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
