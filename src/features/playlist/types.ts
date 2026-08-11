import {
    Prisma,
    Playlist as PrismaPlaylist,
    PlaylistVideo as PrismaPlaylistVideo,
} from '@prisma/client';
import {
    playlistCreateSchema,
    playlistIdSchema,
    playlistUpdateSchema,
    playlistVideoRefSchema,
    updateVideoSchema,
} from './schemas';
import { z } from 'zod';

// Database models
export type Playlist = PrismaPlaylist;
export type PlaylistVideo = PrismaPlaylistVideo;

// Inputs
export type PlaylistCreateData = z.infer<typeof playlistCreateSchema>;

export type PlaylistCreateInput = PlaylistCreateData & {
    userId: string;
};
export type PlaylistUpdateInput = z.infer<typeof playlistUpdateSchema>;

export type PlaylistVideoCreateInput = {
    playlistId: string;
    videoId: string;
};

export type PlaylistVideoReference = z.infer<typeof playlistVideoRefSchema>;

export type PlaylistVideoUpdateInput = z.infer<typeof updateVideoSchema>;

export type PlaylistIdParams = z.infer<typeof playlistIdSchema>;

// Prisma
export const playlistVideoInclude = {
    video: {
        include: {
            source: true,
        },
    },
} satisfies Prisma.PlaylistVideoInclude;

export type PlaylistVideoWithInclude = Prisma.PlaylistVideoGetPayload<{
    include: typeof playlistVideoInclude;
}>;

export const playlistWithVideosInclude = {
    playlistVideos: {
        include: playlistVideoInclude,
    },
} satisfies Prisma.PlaylistInclude;

export type PlaylistWithVideos = Prisma.PlaylistGetPayload<{
    include: typeof playlistWithVideosInclude;
}>;

// DTOs
export type PlaylistVideoDTO = {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    url: string;
    platform?: string | null;
    platformId?: string | null;
    render: boolean;
};

export type PlaylistDTO = {
    id: string;
    name: string;
    description?: string | null;
    videos: PlaylistVideoDTO[];
};
