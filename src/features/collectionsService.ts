import {
    handleNotFoundError,
    handleUniqueConstraintError,
    translateForeignKeyError,
} from 'database/prisma/repoError';
import { CollectionsRepo } from './collections/collectionsRepo';
import { NotFoundError } from 'shared/errors/errors';
import { PlaylistService } from './playlist/services/playlistService';
import { CollectionCreateData, CollectionUpdateParams } from './collections/type';

export type CollectionService = ReturnType<typeof createCollectionService>;
export const createCollectionService = ({
    collectionsRepo,
    playlistService,
}: {
    collectionsRepo: CollectionsRepo;
    playlistService: PlaylistService;
}) => {
    const ensureExistsForUser = async (id: string, userId: string) => {
        const exists = await collectionsRepo.existsForUser({ id, userId });
        if (!exists) {
            throw new NotFoundError('Collection not found', {
                collection: ['Collection not found'],
            });
        }
    };
    const createCollection = async ({ name, userId }: CollectionCreateData) => {
        try {
            return await collectionsRepo.create({ name, userId });
        } catch (error) {
            handleUniqueConstraintError(error, 'Cannot add collection', {
                name: ['You already have a colletion with this name'],
            });
            translateForeignKeyError(error, new NotFoundError('User not found'));
            throw error;
        }
    };

    const deleteCollection = async ({ id, userId }: { id: string; userId: string }) => {
        await ensureExistsForUser(id, userId);
        await collectionsRepo.remove(id);
    };

    const addPlaylist = async ({
        userId,
        playlistId,
        collectionId,
    }: {
        userId: string;
        playlistId: string;
        collectionId: string;
    }) => {
        await ensureExistsForUser(collectionId, userId);
        await playlistService.ensurePlaylistExistsForUser(playlistId, userId);
        try {
            await collectionsRepo.addPlaylist({ id: collectionId, playlistId });
        } catch (error) {
            handleUniqueConstraintError(error, 'Cannot add playlist to collection', {
                playlist: ['You have already added this playlist to this collection'],
            });
            throw error;
        }
    };

    const deletePlaylist = async ({
        userId,
        playlistId,
        collectionId,
    }: {
        userId: string;
        playlistId: string;
        collectionId: string;
    }) => {
        await ensureExistsForUser(collectionId, userId);
        try {
            await collectionsRepo.deletePlaylist({ id: collectionId, playlistId });
        } catch (error) {
            handleNotFoundError(error, 'Playlist not found', {
                playlist: ['Playlist not found in this collection'],
            });
            throw error;
        }
    };

    const update = async ({ userId, id, name }: { userId: string } & CollectionUpdateParams) => {
        await ensureExistsForUser(id, userId);
        try {
            return await collectionsRepo.update({ id, name });
        } catch (error) {
            handleUniqueConstraintError(error, 'Cannot update collection', {
                name: ['you already have a collection with this name'],
            });
            throw error;
        }
    };

    return { createCollection, deleteCollection, addPlaylist, deletePlaylist, update };
};
