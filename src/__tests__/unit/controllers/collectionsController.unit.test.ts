import { Response } from 'express';

import { Collection } from '@prisma/client';

import { AuthRequest } from 'features/auth/types';

import {
    CollectionCreateData,
    CollectionPlaylistParams,
    CollectionUpdateData,
} from 'features/collections/type';

import { buildExpressMocks } from '__tests__/shared/mocks/expressMock';

import { expectMockResponse } from '__tests__/shared/helpers/controllerAssertions';
import { createCollectionController } from 'features/collections/collectionsController';
import { mockCollectionService } from '__tests__/shared/mocks/services/mockCollectionsService';

let mockRes: Response;

const collectionController = createCollectionController(mockCollectionService);

describe('Unit tests: Collection controllers', () => {
    let collection: Collection;
    let userId: string;
    let collectionId: string;
    let playlistId: string;

    beforeEach(() => {
        jest.clearAllMocks();

        ({ mockRes } = buildExpressMocks());

        userId = crypto.randomUUID();
        collectionId = crypto.randomUUID();
        playlistId = crypto.randomUUID();

        collection = {
            id: collectionId,
            userId,
            name: 'My Collection',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    });

    describe('Create collection', () => {
        let mockReq: AuthRequest<any, any, CollectionCreateData>;

        beforeEach(() => {
            mockReq = {
                user: { id: userId },
                body: { name: collection.name },
            } as AuthRequest<any, any, CollectionCreateData>;
        });

        test('Returns 201 and collection on success', async () => {
            mockCollectionService.createCollection.mockResolvedValueOnce(collection);

            await collectionController.createCollection(mockReq, mockRes);

            expect(mockCollectionService.createCollection).toHaveBeenCalledWith({
                userId,
                name: collection.name,
            });

            expectMockResponse({
                mockRes,
                data: { collection },
                status: 201,
            });
        });

        test('Throws service error', async () => {
            const error = new Error('Service error');

            mockCollectionService.createCollection.mockRejectedValueOnce(error);

            await expect(collectionController.createCollection(mockReq, mockRes)).rejects.toThrow(
                error,
            );

            expect(mockCollectionService.createCollection).toHaveBeenCalledWith({
                userId,
                name: collection.name,
            });
        });
    });

    describe('Update collection', () => {
        let mockReq: AuthRequest<{ id: string }, any, CollectionUpdateData>;

        beforeEach(() => {
            mockReq = {
                user: { id: userId },
                params: { id: collectionId },
                body: { name: 'Updated Collection' },
            } as AuthRequest<{ id: string }, any, CollectionUpdateData>;
        });

        test('Returns 200 and collection on success', async () => {
            const updatedCollection = {
                ...collection,
                name: 'Updated Collection',
            };

            mockCollectionService.update.mockResolvedValueOnce(updatedCollection);

            await collectionController.updateCollection(mockReq, mockRes);

            expect(mockCollectionService.update).toHaveBeenCalledWith({
                userId,
                id: collectionId,
                name: 'Updated Collection',
            });

            expectMockResponse({
                mockRes,
                data: { collection: updatedCollection },
                status: 200,
            });
        });

        test('Throws service error', async () => {
            const error = new Error('Service error');

            mockCollectionService.update.mockRejectedValueOnce(error);

            await expect(collectionController.updateCollection(mockReq, mockRes)).rejects.toThrow(
                error,
            );

            expect(mockCollectionService.update).toHaveBeenCalledWith({
                userId,
                id: collectionId,
                name: 'Updated Collection',
            });
        });
    });

    describe('Delete collection', () => {
        let mockReq: AuthRequest<{ id: string }>;

        beforeEach(() => {
            mockReq = {
                user: { id: userId },
                params: { id: collectionId },
            } as AuthRequest<{ id: string }>;
        });

        test('Returns 204 on success', async () => {
            mockCollectionService.deleteCollection.mockResolvedValueOnce();

            await collectionController.deleteCollection(mockReq, mockRes);

            expect(mockCollectionService.deleteCollection).toHaveBeenCalledWith({
                userId,
                id: collectionId,
            });

            expect(mockRes.status).toHaveBeenCalledWith(204);
            expect(mockRes.send).toHaveBeenCalled();
        });

        test('Throws service error', async () => {
            const error = new Error('Service error');

            mockCollectionService.deleteCollection.mockRejectedValueOnce(error);

            await expect(collectionController.deleteCollection(mockReq, mockRes)).rejects.toThrow(
                error,
            );

            expect(mockCollectionService.deleteCollection).toHaveBeenCalledWith({
                userId,
                id: collectionId,
            });
        });
    });

    describe('Add playlist', () => {
        let mockReq: AuthRequest<CollectionPlaylistParams>;

        beforeEach(() => {
            mockReq = {
                user: { id: userId },
                params: {
                    id: collectionId,
                    playlistId,
                },
            } as AuthRequest<CollectionPlaylistParams>;
        });

        test('Returns 204 on success', async () => {
            mockCollectionService.deletePlaylist.mockResolvedValueOnce();

            await collectionController.deletePlaylist(mockReq, mockRes);

            expect(mockCollectionService.deletePlaylist).toHaveBeenCalledWith({
                userId,
                collectionId,
                playlistId,
            });

            expect(mockRes.status).toHaveBeenCalledWith(204);
            expect(mockRes.send).toHaveBeenCalled();
        });

        test('Throws service error', async () => {
            const error = new Error('Service error');

            mockCollectionService.addPlaylist.mockRejectedValueOnce(error);

            await expect(collectionController.addPlaylist(mockReq, mockRes)).rejects.toThrow(error);

            expect(mockCollectionService.addPlaylist).toHaveBeenCalledWith({
                userId,
                collectionId,
                playlistId,
            });
        });
    });

    describe('Delete playlist', () => {
        let mockReq: AuthRequest<CollectionPlaylistParams>;

        beforeEach(() => {
            mockReq = {
                user: { id: userId },
                params: {
                    id: collectionId,
                    playlistId,
                },
            } as AuthRequest<CollectionPlaylistParams>;
        });
        test('Returns 204 on success', async () => {
            mockCollectionService.deletePlaylist.mockResolvedValueOnce();

            await collectionController.deletePlaylist(mockReq, mockRes);

            expect(mockCollectionService.deletePlaylist).toHaveBeenCalledWith({
                userId,
                collectionId,
                playlistId,
            });

            expect(mockRes.status).toHaveBeenCalledWith(204);
            expect(mockRes.send).toHaveBeenCalled();
        });

        test('Throws service error', async () => {
            const error = new Error('Service error');

            mockCollectionService.deletePlaylist.mockRejectedValueOnce(error);

            await expect(collectionController.deletePlaylist(mockReq, mockRes)).rejects.toThrow(
                error,
            );

            expect(mockCollectionService.deletePlaylist).toHaveBeenCalledWith({
                userId,
                collectionId,
                playlistId,
            });
        });
    });
});
