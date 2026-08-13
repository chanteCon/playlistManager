import { randomUUID } from 'crypto';
import {
    Playlist,
    PlaylistCreateInput,
    PlaylistVideo,
    PlaylistWithVideos,
} from 'features/playlist/types';
import { faker } from '@faker-js/faker';
import { VideoSource, VideoWithSource } from 'features/video/types';
import { buildVideoWithSource } from './videoFactory';
import { buildPlaylistVideo } from './playlistVideoFactory';

export const buildPlaylistInput = (
    overrides: Partial<PlaylistCreateInput> = {},
): PlaylistCreateInput => {
    return {
        userId: randomUUID(),
        name: `Playlist: ${randomUUID()}`,
        description: faker.lorem.words(10),
        ...overrides,
    };
};

export const buildPlaylist = (overrides: Partial<Playlist> = {}): Playlist => {
    return {
        id: randomUUID(),
        userId: randomUUID(),
        name: `Playlist: ${randomUUID()}`,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
};

export const buildPlaylistWithVideos = (
    {
        playlistOverrides = {},
        playlistVideoOverrides = [],
        videoOverrides = [],
        sourceOverrides = [],
    }: {
        playlistOverrides?: Partial<Playlist>;
        playlistVideoOverrides?: Partial<PlaylistVideo>[];
        videoOverrides?: Partial<VideoWithSource>[];
        sourceOverrides?: Partial<VideoSource>[];
    } = {},
    length = 3,
): PlaylistWithVideos => {
    const playlist = buildPlaylist(playlistOverrides);

    const playlistVideos = Array.from({ length }, (_, i) => {
        const video = buildVideoWithSource({
            videoOverrides: {
                ...videoOverrides[i],
            },
            sourceOverrides: {
                ...sourceOverrides[i],
            },
        });

        return {
            ...buildPlaylistVideo({
                playlistId: playlist.id,
                videoId: video.id,
                ...(playlistVideoOverrides[i] ?? {}),
            }),
            video,
        };
    });

    return {
        ...playlist,
        playlistVideos,
    };
};
