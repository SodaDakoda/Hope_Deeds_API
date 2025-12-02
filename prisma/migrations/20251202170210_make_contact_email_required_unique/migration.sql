/*
  Warnings:

  - A unique constraint covering the columns `[contactEmail]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - Made the column `contactEmail` on table `Organization` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "contactEmail" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_contactEmail_key" ON "Organization"("contactEmail");
