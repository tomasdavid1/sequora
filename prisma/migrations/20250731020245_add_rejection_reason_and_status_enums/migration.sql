/*
  Warnings:

  - The `status` column on the `Treatment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `TreatmentItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_APPROVED');

-- CreateEnum
CREATE TYPE "TreatmentItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Treatment" DROP COLUMN "status",
ADD COLUMN     "status" "TreatmentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "TreatmentItem" ADD COLUMN     "rejectionReason" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "TreatmentItemStatus" NOT NULL DEFAULT 'PENDING';
