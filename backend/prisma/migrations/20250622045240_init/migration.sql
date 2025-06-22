-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'STAFF_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "AuthAction" AS ENUM ('LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'PASSWORD_SET', 'PASSWORD_CHANGE', 'LOGOUT', 'TOKEN_REFRESH', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED');

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "authGracePeriod" TIMESTAMP(3),
    "empNo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "staffId" INTEGER NOT NULL,
    "memo" TEXT,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" SERIAL NOT NULL,
    "empNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "email" TEXT,
    "workDays" TEXT[],
    "workHours" TEXT NOT NULL,
    "breakHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySchedule" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "memo" TEXT,
    "source" TEXT NOT NULL DEFAULT 'csv',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "MonthlySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjustment" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "memo" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryAssignment" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "tempDept" TEXT NOT NULL,
    "tempGroup" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '支援',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAssignment" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "assignmentType" VARCHAR(10) NOT NULL,
    "customLabel" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_auth" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "userType" "UserType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "passwordSetAt" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "staffId" INTEGER,
    "adminRole" "AdminRole",
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userAuthId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_audit_logs" (
    "id" TEXT NOT NULL,
    "userAuthId" TEXT,
    "action" "AuthAction" NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userAuthId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_empNo_key" ON "Staff"("empNo");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_empNo_key" ON "Contract"("empNo");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySchedule_staffId_date_start_end_key" ON "MonthlySchedule"("staffId", "date", "start", "end");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryAssignment_staffId_startDate_endDate_key" ON "TemporaryAssignment"("staffId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAssignment_staffId_date_key" ON "DailyAssignment"("staffId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_email_key" ON "user_auth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_staffId_key" ON "user_auth"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refreshToken_key" ON "auth_sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySchedule" ADD CONSTRAINT "MonthlySchedule_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryAssignment" ADD CONSTRAINT "TemporaryAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAssignment" ADD CONSTRAINT "DailyAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_auth" ADD CONSTRAINT "user_auth_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userAuthId_fkey" FOREIGN KEY ("userAuthId") REFERENCES "user_auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_userAuthId_fkey" FOREIGN KEY ("userAuthId") REFERENCES "user_auth"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userAuthId_fkey" FOREIGN KEY ("userAuthId") REFERENCES "user_auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
