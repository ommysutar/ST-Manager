-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "inquiryId" TEXT,
    "clientId" TEXT,
    "projectName" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientMobile" TEXT,
    "clientEmail" TEXT,
    "projectCategory" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedEngineer" TEXT NOT NULL DEFAULT '',
    "planId" TEXT,
    "advanceReceived" REAL NOT NULL DEFAULT 0,
    "remainingBalance" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "payload" JSONB NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "projects_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_studioId_projectNumber_key" ON "projects"("studioId", "projectNumber");

-- CreateIndex
CREATE INDEX "projects_studioId_updatedAt_idx" ON "projects"("studioId", "updatedAt");

-- CreateIndex
CREATE INDEX "projects_studioId_deletedAt_idx" ON "projects"("studioId", "deletedAt");
