/*
  Warnings:

  - Added the required column `pokemonId` to the `Member` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Member" ADD COLUMN "pokemonId" INTEGER NOT NULL DEFAULT 1;
