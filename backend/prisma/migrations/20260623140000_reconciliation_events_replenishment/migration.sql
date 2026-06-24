-- HdU: conciliación, outbox eventos, reposición inteligente

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DEAD');

-- AlterEnum
ALTER TYPE "ReplenishmentStatus" ADD VALUE IF NOT EXISTS 'PROPOSED';

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "leadTimeDays" INTEGER NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE "physical_counts" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "countedQty" INTEGER NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countedBy" TEXT,
    "note" TEXT,
    "period" TEXT NOT NULL,

    CONSTRAINT "physical_counts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbound_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "outbound_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "physical_counts_productId_locationId_period_key" ON "physical_counts"("productId", "locationId", "period");
CREATE UNIQUE INDEX "outbound_events_idempotencyKey_key" ON "outbound_events"("idempotencyKey");
CREATE INDEX "outbound_events_status_nextRetryAt_idx" ON "outbound_events"("status", "nextRetryAt");

ALTER TABLE "physical_counts" ADD CONSTRAINT "physical_counts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "physical_counts" ADD CONSTRAINT "physical_counts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
