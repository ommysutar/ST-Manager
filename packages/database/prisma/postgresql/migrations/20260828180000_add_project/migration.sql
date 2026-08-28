-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "projectNumber" VARCHAR(16) NOT NULL,
    "source" VARCHAR(16) NOT NULL,
    "inquiryId" VARCHAR(64),
    "clientId" TEXT,
    "projectName" VARCHAR(120) NOT NULL,
    "clientName" VARCHAR(120) NOT NULL,
    "clientMobile" VARCHAR(64),
    "clientEmail" VARCHAR(255),
    "projectCategory" VARCHAR(120),
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "assignedEngineer" VARCHAR(120) NOT NULL DEFAULT '',
    "planId" VARCHAR(64),
    "advanceReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "payload" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_studioId_projectNumber_key" ON "projects"("studioId", "projectNumber");

-- CreateIndex
CREATE INDEX "projects_studioId_updatedAt_idx" ON "projects"("studioId", "updatedAt");

-- CreateIndex
CREATE INDEX "projects_studioId_deletedAt_idx" ON "projects"("studioId", "deletedAt");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
