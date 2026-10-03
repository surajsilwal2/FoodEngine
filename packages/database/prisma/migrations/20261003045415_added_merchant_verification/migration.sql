-- CreateEnum
CREATE TYPE "MerchantApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PICKED_UP';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';

-- CreateTable
CREATE TABLE "MerchantApplication" (
    "id" SERIAL NOT NULL,
    "applicantId" INTEGER NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "status" "MerchantApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "tenantId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantApplication_applicantId_key" ON "MerchantApplication"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantApplication_tenantId_key" ON "MerchantApplication"("tenantId");

-- CreateIndex
CREATE INDEX "MerchantApplication_status_createdAt_idx" ON "MerchantApplication"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MerchantApplication" ADD CONSTRAINT "MerchantApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantApplication" ADD CONSTRAINT "MerchantApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantApplication" ADD CONSTRAINT "MerchantApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
