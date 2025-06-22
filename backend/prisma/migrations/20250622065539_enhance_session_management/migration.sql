/*
  Warnings:

  - You are about to alter the column `userAgent` on the `auth_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.

*/
-- AlterTable
ALTER TABLE "auth_sessions" ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "refreshExpiresAt" TIMESTAMP(3),
ALTER COLUMN "userAgent" SET DATA TYPE VARCHAR(500);

-- CreateIndex
CREATE INDEX "auth_sessions_userAuthId_idx" ON "auth_sessions"("userAuthId");

-- CreateIndex
CREATE INDEX "auth_sessions_token_idx" ON "auth_sessions"("token");

-- CreateIndex
CREATE INDEX "auth_sessions_refreshToken_idx" ON "auth_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");
