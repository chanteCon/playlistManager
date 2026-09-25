/*
  Warnings:

  - Added the required column `position` to the `PlaylistVideo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlaylistVideo" ADD COLUMN     "position" INTEGER NOT NULL;
