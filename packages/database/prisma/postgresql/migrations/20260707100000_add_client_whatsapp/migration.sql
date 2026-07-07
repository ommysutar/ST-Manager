-- AlterTable
ALTER TABLE "clients" ADD COLUMN "whatsappNumber" VARCHAR(64);
ALTER TABLE "clients" ADD COLUMN "whatsappSameAsPhone" BOOLEAN NOT NULL DEFAULT false;
