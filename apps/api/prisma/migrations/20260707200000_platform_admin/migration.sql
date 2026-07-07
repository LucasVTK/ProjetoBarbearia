-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('SUSPEND', 'REACTIVATE', 'VIEW', 'DENIED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "platformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable (sem foreign keys: auditoria sobrevive a exclusoes)
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "action" "AdminAction" NOT NULL,
    "targetBarbershopId" TEXT,
    "detail" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);
