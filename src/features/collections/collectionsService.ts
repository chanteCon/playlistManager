import {
    handleNotFoundError,
    handleUniqueConstraintError,
    translateForeignKeyError,
} from 'database/prisma/repoError';
import { CollectionsRepo } from './collectionsRepo';
import { BadInputError, NotFoundError } from 'shared/errors/errors';
import { PlaylistService } from '../playlist/services/playlistService';
import {
    CollectionCreateData,
    CollectionDTO,
    CollectionSummaryDTO,
    CollectionUpdateData,
} from './types';
import { Playlist } from '../playlist/types';

export type CollectionService = ReturnType<typeof createCollectionService>;
export const createCollectionService = ({
    collectionsRepo,
    playlistService,
}: {
    collectionsRepo: CollectionsRepo;
    playlistService: PlaylistService;
}) => {
    const _ensureExistsForUser = async (id: string, userId: string) => {
        const exists = await collectionsRepo.findSummaryById({ id, userId });
        if (!exists) {
            throw new NotFoundError('Collection not found', {
                collection: ['Collection not found'],
            });
        }
    };
    const createCollection = async ({
        name,
        userId,
    }: CollectionCreateData): Promise<CollectionSummaryDTO> => {
        try {
            const collection = await collectionsRepo.create({ name, userId });
            return { numPlaylists: 0, ...collection };
        } catch (error) {
            handleUniqueConstraintError(error, 'Cannot add collection', {
                name: ['You already have a colletion with this name'],
            });
            translateForeignKeyError(error, new NotFoundError('User not found'));
            throw error;
        }
    };

    const deleteCollection = async ({ id, userId }: { id: string; userId: string }) => {
        try {
            await collectionsRepo.remove({ id, userId });
        } catch (error) {
            handleNotFoundError(error, 'Collection not found', {
                collection: ['Collection not found'],
            });
            throw error;
        }
    };

    const addPlaylist = async ({
        userId,
        playlistId,
        collectionId,
    }: {
        userId: string;
        playlistId: string;
        collectionId: string;
    }): Promise<Playlist> => {
        await _ensureExistsForUser(collectionId, userId);
        await playlistService.ensurePlaylistExistsForUser(playlistId, userId);
        try {
            const data = await collectionsRepo.addPlaylist({ id: collectionId, playlistId });
            return data.playlist;
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
    }): Promise<void> => {
        await _ensureExistsForUser(collectionId, userId);
        try {
            await collectionsRepo.deletePlaylist({ id: collectionId, playlistId });
        } catch (error) {
            handleNotFoundError(error, 'Playlist not found', {
                playlist: ['Playlist not found in this collection'],
            });
            throw error;
        }
    };

    const update = async ({
        userId,
        id,
        name,
        cover,
    }: { userId: string; id: string } & CollectionUpdateData): Promise<CollectionSummaryDTO> => {
        try {
            let coverUrl: string | null | undefined = undefined;
            if (cover !== undefined) {
                if (cover === null) {
                    coverUrl = null;
                } else {
                    const collectionPlaylist = await collectionsRepo.getCollectionPlaylist({
                        id,
                        userId,
                        playlistId: cover,
                    });
                    if (!collectionPlaylist) {
                        throw new NotFoundError('Collection or playlist not found', {
                            cover: [
                                'Could not find playlist selected for the cover image in this collection.',
                            ],
                        });
                    }
                    if (!collectionPlaylist.playlist?.coverUrl) {
                        throw new BadInputError('Cannot set playlist as cover', {
                            cover: ['This playlist does not have a cover'],
                        });
                    }

                    coverUrl = collectionPlaylist.playlist.coverUrl;
                }
            }
            const updatedCollection = await collectionsRepo.update({ userId, id, name, coverUrl });
            return { ...updatedCollection, numPlaylists: updatedCollection._count.playlists };
        } catch (error) {
            handleUniqueConstraintError(error, 'Cannot update collection', {
                name: ['You already have a collection with this name'],
            });
            handleNotFoundError(error, 'Collection not found', {
                collection: ['Collection not found'],
            });

            throw error;
        }
    };

    const getUserCollections = async (userId: string): Promise<CollectionSummaryDTO[]> => {
        const collections = await collectionsRepo.findUserCollections(userId);
        return collections.map((collection) => ({
            ...collection,
            numPlaylists: collection._count.playlists,
        }));
    };

    const getById = async ({
        id,
        userId,
    }: {
        id: string;
        userId: string;
    }): Promise<CollectionDTO> => {
        const collection = await collectionsRepo.findById({ id, userId });
        if (!collection) {
            throw new NotFoundError('Collection not found', {
                collection: ['Collection not found'],
            });
        }
        return {
            ...collection,
            playlists: collection.playlists.map(({ playlist }) => playlist),
            numPlaylists: collection.playlists.length,
        };
    };

    return {
        createCollection,
        deleteCollection,
        addPlaylist,
        deletePlaylist,
        update,
        getUserCollections,
        getById,
    };
};
