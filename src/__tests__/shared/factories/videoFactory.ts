import { randomUUID } from 'crypto';
import {
    CreateSourceInput,
    CreateVideoInput,
    Platform,
    VideoMetadata,
    VideoSource,
    VideoWithSource,
} from 'features/video/types';
import crypto from 'crypto';
import { faker } from '@faker-js/faker';

export const buildVideoInput = (overrides: Partial<CreateVideoInput> = {}): CreateVideoInput => {
    return {
        url: faker.internet.url(),
        ...overrides,
    };
};

export const buildSourceInput = (overrides: Partial<CreateSourceInput> = {}): CreateSourceInput => {
    const { thumbnail, description, title } = overrides;

    return {
        ...buildMetadata({ thumbnail, description, title }),
        platform: 'youtube' as Platform,
        platformId: generateYoutubeId(),
        ...overrides,
    };
};

export const buildVideo = (overrides: Partial<VideoWithSource> = {}): VideoWithSource => {
    return {
        id: randomUUID(),
        url: faker.internet.url(),
        sourceId: null,
        source: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
};

export const buildVideos = (
    length = 3,
    overrides: Partial<VideoWithSource[]> = [],
): VideoWithSource[] => {
    return Array.from({ length }, (_, i) => buildVideo(overrides[i] ?? {}));
};

const generateYoutubeId = () => {
    return crypto.randomBytes(8).toString('base64url').slice(0, 11);
};

export const buildMetadata = (overrides: Partial<VideoMetadata> = {}) => {
    return {
        title: faker.lorem.words(3),
        thumbnail: faker.image.imageUrl(),
        description: faker.lorem.words(15),
        ...overrides,
    };
};

export const buildVideoSource = (overrides: Partial<VideoSource> = {}): VideoSource => {
    return {
        id: randomUUID(),
        platform: 'youtube' as Platform,
        platformId: generateYoutubeId(),
        ...buildMetadata(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
};

export const buildMultipleVideoSource = (
    length = 3,
    overrides: Partial<VideoSource[]> = [],
): VideoSource[] => {
    return Array.from({ length }, (_, i) => buildVideoSource(overrides[i] ?? {}));
};

export const buildVideoWithSource = ({
    videoOverrides = {},
    sourceOverrides = {},
}: {
    videoOverrides?: Partial<VideoWithSource>;
    sourceOverrides?: Partial<VideoSource>;
}): VideoWithSource => {
    const source = buildVideoSource(sourceOverrides);
    return buildVideo({ source, sourceId: source.id, ...videoOverrides });
};
