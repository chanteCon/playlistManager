import { PrismaClient } from '@prisma/client';
import { PlatformIdentity, VideoMetadata, VideoSource, VideoWithSource } from '../types';
import { PrismaClientTx } from 'database/prisma/dbType';
type VideoRepoDeps = { db: PrismaClient };

export type VideoRepo = ReturnType<typeof createVideoRepo>;

export const createVideoRepo = ({ db }: VideoRepoDeps) => {
    const findById = async (id: string): Promise<VideoWithSource | null> => {
        return await db.video.findUnique({ where: { id }, include: { source: true } });
    };

    const findByUrl = async (url: string): Promise<VideoWithSource | null> => {
        return await db.video.findUnique({ where: { url }, include: { source: true } });
    };

    const findByPlatformIdentity = async (
        platformIdentity: PlatformIdentity,
    ): Promise<VideoSource | null> => {
        return await db.videoSource.findUnique({
            where: { platform_platformId: platformIdentity },
        });
    };

    const touchSource = async (sourceId: string): Promise<VideoSource> => {
        return await db.videoSource.update({
            where: { id: sourceId },
            data: {
                updatedAt: new Date(),
            },
        });
    };

    const updateSourceData = async (
        sourceId: string,
        canonicalUrl: string,
        metadata: VideoMetadata,
    ): Promise<VideoSource> => {
        return db.videoSource.update({
            where: {
                id: sourceId,
            },
            data: { canonicalUrl, ...metadata },
        });
    };

    type UpsertVideoInput = {
        url: string;
        canonicalUrl?: string;
        platformIdentity?: PlatformIdentity;
        metadata?: VideoMetadata;
    };

    const ensureExists = async ({
        canonicalUrl,
        url,
        platformIdentity,
        metadata,
    }: UpsertVideoInput): Promise<VideoWithSource> => {
        return await db.$transaction(async (tx) => {
            let sourceId: string | undefined;

            if (platformIdentity && canonicalUrl) {
                sourceId = await upsertSource({ canonicalUrl, platformIdentity, tx, metadata });
            }

            return await tx.video.upsert({
                where: {
                    url,
                },
                create: {
                    url,
                    sourceId,
                },
                update: {},
                include: {
                    source: true,
                },
            });
        });
    };

    type UpsertSourceInput = {
        canonicalUrl: string;
        platformIdentity: PlatformIdentity;
        tx?: PrismaClientTx;
        metadata?: VideoMetadata;
    };
    const upsertSource = async ({
        canonicalUrl,
        platformIdentity,
        tx = db,
        metadata,
    }: UpsertSourceInput) => {
        const source = await tx.videoSource.upsert({
            where: {
                platform_platformId: platformIdentity,
            },
            create: {
                canonicalUrl,
                ...platformIdentity,
                ...metadata,
            },
            update: {},
        });

        return source.id;
    };

    return {
        findById,
        ensureExists,
        findByUrl,
        touchSource,
        updateSourceData,
        findByPlatformIdentity,
    };
};
