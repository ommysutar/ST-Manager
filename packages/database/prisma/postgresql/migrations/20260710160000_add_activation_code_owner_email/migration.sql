-- Persist owner email on redeemed activation codes

ALTER TABLE "activation_codes" ADD COLUMN "usedByOwnerEmail" VARCHAR(255);
