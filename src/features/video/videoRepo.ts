import { Prisma, Video, Platform, PrismaClient } from '@prisma/client';

type CreateVideoInput = Prisma.VideoCreateInput;
type UpdateVideoInput = { id: string; data: Omit<Prisma.VideoUpdateInput, 'id'> };
type VideoRepoDeps = { db: PrismaClient };

export type VideoRepo = ReturnType<typeof createVideoRepo>;

export const createVideoRepo = async ({ db }: VideoRepoDeps) => {
    const create = async (data: CreateVideoInput): Promise<Video> => {
        return await db.video.create({ data });
    };

    const remove = async (id: string): Promise<Video> => {
        return await db.video.delete({ where: { id } });
    };

    const findById = async (id: string): Promise<Video | null> => {
        return await db.video.findUnique({ where: { id } });
    };

    const findByPlatformId = async ({
        platform,
        platformId,
    }: {
        platform: Platform;
        platformId: string;
    }): Promise<Video | null> => {
        return await db.video.findUnique({
            where: { platform_platformId: { platform, platformId } },
        });
    };

    const update = async ({ id, data }: UpdateVideoInput): Promise<Video> => {
        return await db.video.update({ where: { id }, data });
    };

    return { create, remove, findById, findByPlatformId, update };
};
