import { PrismaClient } from '@prisma/client';
import { PlaylistVideoWithInclude, playlistVideoInclude } from '../types';
import { PrismaClientTx } from 'database/prisma/dbType';

type PlaylistVideoRepoDeps = { db: PrismaClient };
export type PlaylistVideoRepo = ReturnType<typeof createPlaylistVideoRepo>;

export const createPlaylistVideoRepo = ({ db }: PlaylistVideoRepoDeps) => {
    const create = async (
        playlistId: string,
        videoId: string,
    ): Promise<PlaylistVideoWithInclude> => {
        const position = await getNextPosition(playlistId);
        return await db.playlistVideo.create({
            data: {
                playlistId,
                videoId,
                position,
            },
            include: playlistVideoInclude,
        });
    };

    const getNextPosition = async (playlistId: string): Promise<number> => {
        const result = await db.playlistVideo.aggregate({
            where: { playlistId },
            _max: { position: true },
        });

        return (result._max.position ?? -1) + 1;
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

    const findSource = async (id: string, playlistId: string) => {
        return await db.playlistVideo.findFirst({
            where: { id, playlistId },
            include: playlistVideoInclude,
        });
    };

    const updatePositions = async ({
        playlistId,
        positions,
        tx = db,
    }: {
        playlistId: string;
        positions: { id: string; position: number }[];
        tx?: PrismaClientTx;
    }) => {
        return await Promise.all(
            positions.map(({ id, position }) =>
                tx.playlistVideo.update({
                    where: {
                        id,
                        playlistId,
                    },
                    data: {
                        position,
                    },
                }),
            ),
        );
    };

    return {
        create,
        update,
        deleteFromPlaylist,
        findSource,
        updatePositions,
    };
};
