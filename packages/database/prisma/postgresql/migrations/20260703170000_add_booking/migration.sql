-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" VARCHAR(120) NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'confirmed',
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_studioId_startAt_endAt_idx" ON "bookings"("studioId", "startAt", "endAt");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
