/*
  Warnings:

  - Added the required column `isApproved` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `licenseNumber` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleDetails` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "isApproved" BOOLEAN NOT NULL,
ADD COLUMN     "licenseNumber" TEXT NOT NULL,
ADD COLUMN     "vehicleDetails" TEXT NOT NULL;
