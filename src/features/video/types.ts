import {
    Platform as PrismaPlatform,
    Video as PrismaVideo,
    VideoSource as PrismaVideoSource,
    Prisma,
} from '@prisma/client';
export type PlatformIdentity = { platform: PrismaPlatform; platformId: string };
export type Platform = PrismaPlatform;
export type Video = PrismaVideo;
export type VideoSource = PrismaVideoSource;

export type CreateVideoInput = Omit<Prisma.VideoCreateInput, 'id' | 'createdAt' | 'updatedAt'>;

export type VideoMetadata = Pick<
    Prisma.VideoSourceCreateInput,
    'thumbnail' | 'title' | 'description'
>;
export type VideoWithSource = Video & { source: VideoSource | null };

export type CreateSourceInput = {
    platform: Platform;
    platformId: string;
} & VideoMetadata;
