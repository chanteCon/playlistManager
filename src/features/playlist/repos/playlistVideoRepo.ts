import { PrismaClient } from '@prisma/client';
import { PlaylistVideoWithInclude, playlistVideoInclude } from '../types';

type PlaylistVideoRepoDeps = { db: PrismaClient };
export type PlaylistVideoRepo = ReturnType<typeof createPlaylistVideoRepo>;

export const createPlaylistVideoRepo = ({ db }: PlaylistVideoRepoDeps) => {
    const create = async (
        playlistId: string,
        videoId: string,
    ): Promise<PlaylistVideoWithInclude> => {
        return await db.playlistVideo.create({
            data: {
                playlistId,
                videoId,
            },
            include: playlistVideoInclude,
        });
    };

    const update = async (
        id: string,
        playlistId: string,
        data: { customTitle?: string; customDescription?: string },
    ): Promise<PlaylistVideoWithInclude> => {
        return await db.playlistVideo.update({
            where: { playlistId, id },
            data,
            include: playlistVideoInclude,
        });
    };

    const deleteFromPlaylist = async (playlistId: string, id: string) => {
        await db.playlistVideo.delete({
            where: { playlistId, id },
        });
    };

    return {
        create,
        update,
        deleteFromPlaylist,
    };
};
