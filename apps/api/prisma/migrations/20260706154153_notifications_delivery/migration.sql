/*
  Warnings:

  - Added the required column `message` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationRecipient" AS ENUM ('CLIENT', 'OWNER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEW_APPOINTMENT';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "recipient" "NotificationRecipient" NOT NULL DEFAULT 'CLIENT',
ADD COLUMN     "scheduledFor" TIMESTAMP(3);
