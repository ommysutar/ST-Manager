-- CreateTable
CREATE TABLE "project_bookings" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roomStudioId" VARCHAR(64) NOT NULL,
    "clientId" TEXT,
    "bookingFor" VARCHAR(120) NOT NULL,
    "notes" VARCHAR(2000) NOT NULL DEFAULT '',
    "date" VARCHAR(10) NOT NULL,
    "slotId" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'booked',
    "clientName" VARCHAR(120) NOT NULL,
    "projectName" VARCHAR(120) NOT NULL,
    "projectNumber" VARCHAR(32) NOT NULL,
    "payload" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_bookings_studioId_updatedAt_idx" ON "project_bookings"("studioId", "updatedAt");

-- CreateIndex
CREATE INDEX "project_bookings_studioId_deletedAt_idx" ON "project_bookings"("studioId", "deletedAt");

-- Partial unique index: prevent double-booking for occupying statuses
CREATE UNIQUE INDEX "project_bookings_slot_occupancy" ON "project_bookings"("studioId", "roomStudioId", "date", "slotId") WHERE "deletedAt" IS NULL AND "status" IN ('draft', 'booked', 'completed');

-- AddForeignKey
ALTER TABLE "project_bookings" ADD CONSTRAINT "project_bookings_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bookings" ADD CONSTRAINT "project_bookings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
