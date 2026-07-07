-- AlterTable
ALTER TABLE "clients" ADD COLUMN "whatsappNumber" TEXT;
ALTER TABLE "clients" ADD COLUMN "whatsappSameAsPhone" BOOLEAN NOT NULL DEFAULT false;
