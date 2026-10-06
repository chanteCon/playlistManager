import { Platform, PrismaClient } from '@prisma/client';

import { playlistVideoInclude } from '../playlist/types';

type SearchRepoDeps = {
    db: PrismaClient;
};

export type SearchRepo = ReturnType<typeof createSearchRepo>;

export const createSearchRepo = ({ db }: SearchRepoDeps) => {
    const search = async (userId: string, search: string) => {
        const normalizedSearch = search.trim().toLowerCase();

        const platform: Platform | undefined =
            normalizedSearch === 'youtube'
                ? Platform.youtube
                : normalizedSearch === 'tiktok'
                  ? Platform.tiktok
                  : undefined;

        const [collections, playlists, playlistVideos] = await Promise.all([
            db.collection.findMany({
                where: {
                    userId,
                    name: {
                        contains: normalizedSearch,
                        mode: 'insensitive',
                    },
                },
                include: {
                    _count: {
                        select: {
                            playlists: true,
                        },
                    },
                },
            }),

            db.playlist.findMany({
                where: {
                    userId,
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
                },
                include: {
                    _count: {
                        select: {
                            playlistVideos: true,
                        },
                    },
                    playlistVideos: {
                        include: playlistVideoInclude,
                        orderBy: {
                            position: 'asc',
                        },
                    },
                },
            }),
            db.playlistVideo.findMany({
                where: {
                    playlist: {
                        userId,
                    },
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
                },
                include: playlistVideoInclude,
            }),
        ]);

        return {
            collections,
            playlists,
            playlistVideos,
        };
    };

    return {
        search,
    };
};
