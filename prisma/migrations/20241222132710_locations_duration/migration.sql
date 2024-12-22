/*
  Warnings:

  - Added the required column `duration` to the `songs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "songs" ADD COLUMN     "duration" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "minLevel" INTEGER NOT NULL,
    "maxLevel" INTEGER NOT NULL,
    "inversion" BOOLEAN NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);
