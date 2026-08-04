import { randomUUID } from 'crypto';
import {
    PlaylistVideo,
    PlaylistVideoCreateInput,
    PlaylistVideoUpdateInput,
    PlaylistVideoWithInclude,
} from 'features/playlist/types';
import { faker } from '@faker-js/faker';
import { VideoSource, VideoWithSource } from 'features/video/types';
import { buildVideoWithSource } from './videoFactory';

export const buildPlaylistVideo = (overrides: Partial<PlaylistVideo> = {}): PlaylistVideo => {
    return {
        id: randomUUID(),
        createdAt: new Date(),
        ...buildPlaylistVideoInput(),
        ...overrides,
        customDescription: overrides.customDescription ?? null,
        customTitle: overrides.customTitle ?? null,
    };
};

export const buildPlaylistVideoInput = (
    overrides: Partial<PlaylistVideoCreateInput> = {},
): PlaylistVideoCreateInput => {
    return {
        playlistId: randomUUID(),
        videoId: randomUUID(),
        ...overrides,
    };
};

export const buildCustomPlaylistVideoInput = (
    overrides: Partial<PlaylistVideoCreateInput & PlaylistVideoUpdateInput> = {},
): PlaylistVideoCreateInput & PlaylistVideoUpdateInput => {
    return {
        playlistId: randomUUID(),
        videoId: randomUUID(),
        customDescription: faker.lorem.words(10),
        customTitle: faker.lorem.words(1),
        ...overrides,
    };
};

export const buildPlaylistVideos = (
    length = 3,
    overrides: Partial<PlaylistVideo>[] = [],
): PlaylistVideo[] => {
    return Array.from({ length }, (_, i) => buildPlaylistVideo(overrides[i] ?? {}));
};

export const buildPlaylistVideoInclude = ({
    playlistVideoOverrides = {},
    videoOverrides = {},
    sourceOverrides = {},
}: {
    playlistVideoOverrides?: Partial<PlaylistVideo>;
    videoOverrides?: Partial<VideoWithSource>;
    sourceOverrides?: Partial<VideoSource>;
} = {}): PlaylistVideoWithInclude => {
    const video = buildVideoWithSource({
        videoOverrides,
        sourceOverrides,
    });

    return {
        ...buildPlaylistVideo({
            videoId: video.id,
            ...playlistVideoOverrides,
        }),
        video,
    };
};
