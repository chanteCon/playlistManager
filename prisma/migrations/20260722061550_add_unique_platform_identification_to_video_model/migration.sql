/*
  Warnings:

  - A unique constraint covering the columns `[platform,platformId]` on the table `Video` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `platform` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformId` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('youtube', 'tiktok');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "platform" TEXT NOT NULL,
ADD COLUMN     "platformId" TEXT NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Video_platform_platformId_key" ON "Video"("platform", "platformId");
