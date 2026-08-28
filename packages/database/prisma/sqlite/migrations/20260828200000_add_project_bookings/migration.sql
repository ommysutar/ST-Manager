-- CreateTable
CREATE TABLE "project_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roomStudioId" TEXT NOT NULL,
    "clientId" TEXT,
    "bookingFor" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "clientName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "project_bookings_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "project_bookings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "project_bookings_studioId_updatedAt_idx" ON "project_bookings"("studioId", "updatedAt");

-- CreateIndex
CREATE INDEX "project_bookings_studioId_deletedAt_idx" ON "project_bookings"("studioId", "deletedAt");

-- Partial unique index: prevent double-booking for occupying statuses
CREATE UNIQUE INDEX "project_bookings_slot_occupancy" ON "project_bookings"("studioId", "roomStudioId", "date", "slotId") WHERE "deletedAt" IS NULL AND "status" IN ('draft', 'booked', 'completed');
