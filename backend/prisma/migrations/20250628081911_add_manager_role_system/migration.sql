-- CreateEnum
CREATE TYPE "ManagerPermission" AS ENUM ('READ', 'WRITE', 'APPROVE', 'DELETE');

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "isManager" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managerActivatedAt" TIMESTAMP(3),
ADD COLUMN     "managerDepartments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "managerPermissions" "ManagerPermission"[] DEFAULT ARRAY[]::"ManagerPermission"[];

-- CreateTable
CREATE TABLE "system_admins" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "system_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_audit_logs" (
    "id" SERIAL NOT NULL,
    "managerId" INTEGER NOT NULL,
    "targetStaffId" INTEGER,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" SERIAL NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_username_key" ON "system_admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_email_key" ON "system_admins"("email");

-- CreateIndex
CREATE INDEX "manager_audit_logs_managerId_idx" ON "manager_audit_logs"("managerId");

-- CreateIndex
CREATE INDEX "manager_audit_logs_targetStaffId_idx" ON "manager_audit_logs"("targetStaffId");

-- CreateIndex
CREATE INDEX "manager_audit_logs_action_idx" ON "manager_audit_logs"("action");

-- CreateIndex
CREATE INDEX "manager_audit_logs_timestamp_idx" ON "manager_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminId_idx" ON "admin_audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_timestamp_idx" ON "admin_audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "manager_audit_logs" ADD CONSTRAINT "manager_audit_logs_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "system_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
