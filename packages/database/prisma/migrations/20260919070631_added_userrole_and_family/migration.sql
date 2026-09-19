/*
  Warnings:

  - Added the required column `family` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "family" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userRole" "UserRole" NOT NULL DEFAULT 'CUSTOMER';
