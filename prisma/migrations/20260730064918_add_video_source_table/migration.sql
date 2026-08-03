/*
  Warnings:

  - You are about to drop the column `description` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `platformId` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Video` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[url]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Video_platform_platformId_key";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "description",
DROP COLUMN "platform",
DROP COLUMN "platformId",
DROP COLUMN "thumbnail",
DROP COLUMN "title",
ADD COLUMN     "sourceId" TEXT;

-- CreateTable
CREATE TABLE "VideoSource" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformId" TEXT NOT NULL,
    "title" TEXT,
    "thumbnail" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoSource_platform_platformId_key" ON "VideoSource"("platform", "platformId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_url_key" ON "Video"("url");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VideoSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
