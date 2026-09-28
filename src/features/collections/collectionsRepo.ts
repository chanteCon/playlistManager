import { PrismaClient } from '@prisma/client';
import { CollectionCreateData, CollectionPlaylistParams, CollectionUpdateParams } from './type';

export type CollectionsRepo = ReturnType<typeof createCollectionsRepo>;
export const createCollectionsRepo = ({ db }: { db: PrismaClient }) => {
    const create = async ({ userId, name }: CollectionCreateData) => {
        return await db.collection.create({ data: { name, userId } });
    };

    const addPlaylist = async ({ id: collectionId, playlistId }: CollectionPlaylistParams) => {
        return await db.collectionPlaylist.create({ data: { collectionId, playlistId } });
    };

    const deletePlaylist = async ({ id: collectionId, playlistId }: CollectionPlaylistParams) => {
        return await db.collectionPlaylist.delete({
            where: { collectionId_playlistId: { collectionId, playlistId } },
        });
    };

    const remove = async (id: string) => {
        return await db.collection.delete({ where: { id } });
    };

    const update = async ({ id, name }: CollectionUpdateParams) => {
        return await db.collection.update({ where: { id }, data: { name } });
    };

    const existsForUser = async ({ id, userId }: { id: string; userId: string }) => {
        const collection = await db.collection.findFirst({ where: { id, userId } });
        return Boolean(collection);
    };
    return { create, remove, addPlaylist, deletePlaylist, update, existsForUser };
};
