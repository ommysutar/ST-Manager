-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "lineItems" JSONB NOT NULL,
    "subtotal" REAL NOT NULL,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL,
    "total" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "issuedAt" DATETIME,
    "paidAt" DATETIME,
    "notes" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_sessionId_key" ON "invoices"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_clientId_status_idx" ON "invoices"("clientId", "status");

-- CreateIndex
CREATE INDEX "invoices_status_paidAt_idx" ON "invoices"("status", "paidAt");
