-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "coverVideoId" TEXT;

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_coverVideoId_fkey" FOREIGN KEY ("coverVideoId") REFERENCES "VideoSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
