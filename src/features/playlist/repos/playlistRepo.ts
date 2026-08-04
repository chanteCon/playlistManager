import { PrismaClient } from '@prisma/client';
import {
    Playlist,
    PlaylistCreateInput,
    PlaylistUpdateInput,
    PlaylistWithVideos,
    playlistWithVideosInclude,
} from '../types';

type PlaylistRepoDeps = { db: PrismaClient };
export type PlaylistRepo = ReturnType<typeof createPlaylistRepo>;

export const createPlaylistRepo = ({ db }: PlaylistRepoDeps) => {
    const create = async (data: PlaylistCreateInput): Promise<Playlist> => {
        return await db.playlist.create({
            data: {
                ...data,
            },
        });
    };

    const findUserPlaylists = async (userId: string): Promise<Playlist[]> => {
        return await db.playlist.findMany({
            where: { userId },
        });
    };

    const existsForUser = async (playlistId: string, userId: string): Promise<boolean> => {
        const count = await db.playlist.count({
            where: { id: playlistId, userId },
        });
        return count > 0;
    };

    const findById = async (
        playlistId: string,
        userId: string,
    ): Promise<PlaylistWithVideos | null> => {
        return await db.playlist.findUnique({
            where: { id: playlistId, userId },
            include: playlistWithVideosInclude,
        });
    };

    const update = async (
        playlistId: string,
        userId: string,
        data: PlaylistUpdateInput,
    ): Promise<Playlist> => {
        return await db.playlist.update({
            where: { id: playlistId, userId },
            data,
        });
    };

    const deleteById = async (playlistId: string, userId: string): Promise<Playlist> => {
        return await db.playlist.delete({
            where: { id: playlistId, userId },
        });
    };

    return { create, existsForUser, findUserPlaylists, findById, update, deleteById };
};
