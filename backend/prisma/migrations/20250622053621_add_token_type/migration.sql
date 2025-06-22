-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('PASSWORD_RESET', 'INITIAL_PASSWORD_SETUP');

-- AlterTable
ALTER TABLE "password_reset_tokens" ADD COLUMN     "tokenType" "TokenType" NOT NULL DEFAULT 'PASSWORD_RESET';
