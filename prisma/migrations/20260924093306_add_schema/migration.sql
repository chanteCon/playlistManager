/*
  Warnings:

  - Added the required column `position` to the `PlaylistVideo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlaylistVideo"
ADD COLUMN "position" INTEGER;

UPDATE "PlaylistVideo" pv
SET "position" = positions.position
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY "playlistId"
            ORDER BY "createdAt", id
        ) - 1 AS position
    FROM "PlaylistVideo"
) positions
WHERE pv.id = positions.id;

ALTER TABLE "PlaylistVideo"
ALTER COLUMN "position" SET NOT NULL;