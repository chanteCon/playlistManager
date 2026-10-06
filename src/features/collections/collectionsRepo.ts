import { PrismaClient } from '@prisma/client';

import { CollectionCreateData, CollectionPlaylistParams, CollectionUpdateParams } from './types';

export type CollectionsRepo = ReturnType<typeof createCollectionsRepo>;

export const createCollectionsRepo = ({ db }: { db: PrismaClient }) => {
    const create = async ({ userId, name }: CollectionCreateData) => {
        return await db.collection.create({
            data: { name, userId },
        });
    };

    const addPlaylist = async ({ id: collectionId, playlistId }: CollectionPlaylistParams) => {
        return await db.collectionPlaylist.create({
            data: { collectionId, playlistId },
            include: { playlist: true },
        });
    };

    const deletePlaylist = async ({ id: collectionId, playlistId }: CollectionPlaylistParams) => {
        return await db.collectionPlaylist.delete({
            where: {
                collectionId_playlistId: {
                    collectionId,
                    playlistId,
                },
            },
        });
    };

    const remove = async ({ id, userId }: { id: string; userId: string }) => {
        return await db.collection.delete({
            where: {
                userId,
                id,
            },
        });
    };

    const update = async ({
        id,
        userId,
        name,
        coverUrl,
    }: CollectionUpdateParams & { userId: string }) => {
        return await db.collection.update({
            where: {
                userId,
                id,
            },
            data: {
                name,
                coverUrl,
            },
            include: {
                _count: {
                    select: {
                        playlists: true,
                    },
                },
            },
        });
    };

    const findUserCollections = async (userId: string) => {
        return await db.collection.findMany({
            where: { userId },
            include: {
                _count: {
                    select: {
                        playlists: true,
                    },
                },
            },
        });
    };

    const findById = async ({ id, userId }: { id: string; userId: string }) => {
        return await db.collection.findUnique({
            where: {
                userId,
                id,
            },
            include: {
                playlists: {
                    include: {
                        playlist: true,
                    },
                },
            },
        });
    };

    const findSummaryById = async ({ userId, id }: { userId: string; id: string }) => {
        return await db.collection.findUnique({ where: { userId, id } });
    };

    const getCollectionPlaylist = async ({
        id: collectionId,
        userId,
        playlistId,
    }: {
        id: string;
        userId: string;
        playlistId: string;
    }) => {
        return await db.collectionPlaylist.findFirst({
            where: {
                collectionId,
                playlistId,
                collection: {
                    userId,
                },
            },
            include: {
                playlist: true,
            },
        });
    };
    return {
        create,
        remove,
        addPlaylist,
        deletePlaylist,
        update,
        findUserCollections,
        findById,
        findSummaryById,
        getCollectionPlaylist,
    };
};
