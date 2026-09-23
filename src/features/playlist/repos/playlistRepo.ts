import { Platform, PrismaClient } from '@prisma/client';
import {
    Playlist,
    PlaylistCreateInput,
    PlaylistUpdateInput,
    playlistVideoInclude,
    PlaylistWithVideos,
} from '../types';

type PlaylistRepoDeps = { db: PrismaClient };
export type PlaylistRepo = ReturnType<typeof createPlaylistRepo>;

export const createPlaylistRepo = ({ db }: PlaylistRepoDeps) => {
    const create = async (data: PlaylistCreateInput): Promise<Playlist> => {
        return await db.playlist.create({ data });
    };
    const findUserPlaylists = async (userId: string, search?: string): Promise<Playlist[]> => {
        const normalizedSearch = search?.trim().toLowerCase();

        return await db.playlist.findMany({
            where: {
                userId,
                ...(normalizedSearch && {
                    OR: [
                        {
                            name: {
                                contains: normalizedSearch,
                                mode: 'insensitive',
                            },
                        },
                        {
                            description: {
                                contains: normalizedSearch,
                                mode: 'insensitive',
                            },
                        },
                    ],
                }),
            },
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
        search?: string,
    ): Promise<PlaylistWithVideos | null> => {
        const normalizedSearch = search?.trim().toLowerCase();

        const platform: Platform | undefined =
            normalizedSearch === 'youtube'
                ? Platform.youtube
                : normalizedSearch === 'tiktok'
                  ? Platform.tiktok
                  : undefined;

        return await db.playlist.findFirst({
            where: {
                id: playlistId,
                userId,
            },
            include: {
                playlistVideos: {
                    where: normalizedSearch
                        ? {
                              OR: [
                                  {
                                      customTitle: {
                                          contains: normalizedSearch,
                                          mode: 'insensitive',
                                      },
                                  },
                                  {
                                      AND: [
                                          { customTitle: null },
                                          {
                                              video: {
                                                  source: {
                                                      title: {
                                                          contains: normalizedSearch,
                                                          mode: 'insensitive',
                                                      },
                                                  },
                                              },
                                          },
                                      ],
                                  },
                                  {
                                      customDescription: {
                                          contains: normalizedSearch,
                                          mode: 'insensitive',
                                      },
                                  },
                                  {
                                      AND: [
                                          { customDescription: null },
                                          {
                                              video: {
                                                  source: {
                                                      description: {
                                                          contains: normalizedSearch,
                                                          mode: 'insensitive',
                                                      },
                                                  },
                                              },
                                          },
                                      ],
                                  },
                                  ...(platform
                                      ? [
                                            {
                                                video: {
                                                    source: {
                                                        platform,
                                                    },
                                                },
                                            },
                                        ]
                                      : []),
                              ],
                          }
                        : undefined,
                    include: playlistVideoInclude,
                },
            },
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
