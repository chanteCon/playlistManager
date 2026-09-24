/*
  Warnings:

  - You are about to drop the column `coverVideoId` on the `Playlist` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Playlist" DROP CONSTRAINT "Playlist_coverVideoId_fkey";

-- AlterTable
ALTER TABLE "Playlist" DROP COLUMN "coverVideoId",
ADD COLUMN     "coverUrl" TEXT;
