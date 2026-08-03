/*
  Warnings:

  - Added the required column `canonicalUrl` to the `VideoSource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VideoSource" ADD COLUMN     "canonicalUrl" TEXT NOT NULL;
