-- AlterTable: add PIN authentication fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pinHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pinSetAt" TIMESTAMP(3);
