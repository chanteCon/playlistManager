import { Prisma, PrismaClient } from '@prisma/client';

export const seedCollection = async (
    db: PrismaClient,
    overrides: Partial<Prisma.CollectionUncheckedCreateInput> = {},
) => {
    return await db.collection.create({
        data: {
            userId: overrides.userId!,
            name: overrides.name ?? 'Test Collection',
            coverUrl: overrides.coverUrl ?? null,
            ...overrides,
        },
    });
};
export const seedCollectionPlaylist = async (
    db: PrismaClient,
    overrides: Partial<Prisma.CollectionPlaylistUncheckedCreateInput> = {},
) => {
    return await db.collectionPlaylist.create({
        data: {
            collectionId: overrides.collectionId!,
            playlistId: overrides.playlistId!,
            ...overrides,
        },
    });
};
