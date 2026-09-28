import { User } from '@prisma/client';
import { createTestInfrastructure, InfraStructure } from '__tests__/setup/infrastructure';
import {
    createCollectionServiceFixture,
    createPlaylistServiceFixture,
} from '__tests__/setup/integration';

import { buildUserInput } from '__tests__/shared/factories';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedPlaylist, seedUser } from '__tests__/shared/seeds/seeds';
import { CollectionService } from 'features/collectionsService';
import { mockVideoMetadataService } from '__tests__/shared/mocks/services';

let testEnv: InfraStructure & {
    collectionService: CollectionService;
};

describe('Integration tests: Collection service', () => {
    let user: User;

    beforeAll(async () => {
        const infra = await createTestInfrastructure();
        const playlistService = createPlaylistServiceFixture({
            ...infra,
            videoMetadataService: mockVideoMetadataService,
        });
        const collection = createCollectionServiceFixture({ ...infra, playlistService });

        testEnv = {
            ...infra,
            ...collection,
        };
    });

    afterAll(async () => {
        await testEnv.teardown();
    });

    beforeEach(async () => {
        await truncateDbTables(testEnv.db);

        user = await seedUser(testEnv.db, {
            ...buildUserInput(),
            verified: true,
        });
    });

    describe('createCollection', () => {
        test('Successfully creates collection for user', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            expect(collection.name).toBe('My Collection');
            expect(collection.userId).toBe(user.id);

            const dbCollection = await testEnv.db.collection.findUnique({
                where: { id: collection.id },
            });

            expect(dbCollection).not.toBeNull();
            expect(dbCollection!.userId).toBe(user.id);
        });

        test('Throws if collection name already exists for user', async () => {
            await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            await expect(
                testEnv.collectionService.createCollection({
                    userId: user.id,
                    name: 'My Collection',
                }),
            ).rejects.toThrow('Cannot add collection');

            const collections = await testEnv.db.collection.findMany({
                where: { userId: user.id },
            });

            expect(collections).toHaveLength(1);
        });

        test('Allows different users to create collections with the same name', async () => {
            await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const otherUser = await seedUser(testEnv.db);

            await expect(
                testEnv.collectionService.createCollection({
                    userId: otherUser.id,
                    name: 'My Collection',
                }),
            ).resolves.not.toThrow();

            const collections = await testEnv.db.collection.findMany({
                where: { name: 'My Collection' },
            });

            expect(collections).toHaveLength(2);
        });
    });

    describe('deleteCollection', () => {
        test('Successfully deletes collection belonging to user', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            await testEnv.collectionService.deleteCollection({
                id: collection.id,
                userId: user.id,
            });

            const dbCollection = await testEnv.db.collection.findUnique({
                where: { id: collection.id },
            });

            expect(dbCollection).toBeNull();
        });

        test('Throws if collection does not belong to user', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const otherUser = await seedUser(testEnv.db);

            await expect(
                testEnv.collectionService.deleteCollection({
                    id: collection.id,
                    userId: otherUser.id,
                }),
            ).rejects.toThrow('Collection not found');

            const dbCollection = await testEnv.db.collection.findUnique({
                where: { id: collection.id },
            });

            expect(dbCollection).not.toBeNull();
        });

        test('Throws if collection does not exist', async () => {
            await expect(
                testEnv.collectionService.deleteCollection({
                    id: crypto.randomUUID(),
                    userId: user.id,
                }),
            ).rejects.toThrow('Collection not found');
        });
    });

    describe('addPlaylist', () => {
        test('Successfully adds playlist to collection', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const playlist = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            await testEnv.collectionService.addPlaylist({
                userId: user.id,
                collectionId: collection.id,
                playlistId: playlist.id,
            });

            const relation = await testEnv.db.collectionPlaylist.findUnique({
                where: {
                    collectionId_playlistId: {
                        collectionId: collection.id,
                        playlistId: playlist.id,
                    },
                },
            });

            expect(relation).not.toBeNull();
        });

        test('Throws if playlist already belongs to collection', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const playlist = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            await testEnv.collectionService.addPlaylist({
                userId: user.id,
                collectionId: collection.id,
                playlistId: playlist.id,
            });

            await expect(
                testEnv.collectionService.addPlaylist({
                    userId: user.id,
                    collectionId: collection.id,
                    playlistId: playlist.id,
                }),
            ).rejects.toThrow('Cannot add playlist to collection');

            const relations = await testEnv.db.collectionPlaylist.findMany({
                where: { collectionId: collection.id },
            });

            expect(relations).toHaveLength(1);
        });

        test('Throws if collection does not belong to user', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const otherUser = await seedUser(testEnv.db);

            const playlist = await seedPlaylist(testEnv.db, {
                userId: otherUser.id,
            });

            await expect(
                testEnv.collectionService.addPlaylist({
                    userId: otherUser.id,
                    collectionId: collection.id,
                    playlistId: playlist.id,
                }),
            ).rejects.toThrow('Collection not found');
        });

        test('Throws if playlist does not belong to user', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const otherUser = await seedUser(testEnv.db);

            const playlist = await seedPlaylist(testEnv.db, {
                userId: otherUser.id,
            });

            await expect(
                testEnv.collectionService.addPlaylist({
                    userId: user.id,
                    collectionId: collection.id,
                    playlistId: playlist.id,
                }),
            ).rejects.toThrow('Playlist not found');
        });
    });

    describe('deletePlaylist', () => {
        test('Successfully removes playlist from collection', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const playlist = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            await testEnv.collectionService.addPlaylist({
                userId: user.id,
                collectionId: collection.id,
                playlistId: playlist.id,
            });

            await testEnv.collectionService.deletePlaylist({
                userId: user.id,
                collectionId: collection.id,
                playlistId: playlist.id,
            });

            const relation = await testEnv.db.collectionPlaylist.findUnique({
                where: {
                    collectionId_playlistId: {
                        collectionId: collection.id,
                        playlistId: playlist.id,
                    },
                },
            });

            expect(relation).toBeNull();
        });

        test('Throws if playlist is not in collection', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const playlist = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            await expect(
                testEnv.collectionService.deletePlaylist({
                    userId: user.id,
                    collectionId: collection.id,
                    playlistId: playlist.id,
                }),
            ).rejects.toThrow('Playlist not found');
        });

        test('Throws if collection does not belong to user', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const otherUser = await seedUser(testEnv.db);

            await expect(
                testEnv.collectionService.deletePlaylist({
                    userId: otherUser.id,
                    collectionId: collection.id,
                    playlistId: crypto.randomUUID(),
                }),
            ).rejects.toThrow('Collection not found');
        });
    });
    describe('updateCollection', () => {
        test('Successfully updates collection belonging to user', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const updatedCollection = await testEnv.collectionService.update({
                id: collection.id,
                userId: user.id,
                name: 'Updated Collection',
            });

            expect(updatedCollection.name).toBe('Updated Collection');
            expect(updatedCollection.userId).toBe(user.id);

            const dbCollection = await testEnv.db.collection.findUnique({
                where: { id: collection.id },
            });

            expect(dbCollection).not.toBeNull();
            expect(dbCollection!.name).toBe('Updated Collection');
        });

        test('Throws if collection does not belong to user', async () => {
            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            const otherUser = await seedUser(testEnv.db);

            await expect(
                testEnv.collectionService.update({
                    id: collection.id,
                    userId: otherUser.id,
                    name: 'Updated Collection',
                }),
            ).rejects.toThrow('Collection not found');

            const dbCollection = await testEnv.db.collection.findUnique({
                where: { id: collection.id },
            });

            expect(dbCollection!.name).toBe('My Collection');
        });

        test('Throws if collection does not exist', async () => {
            await expect(
                testEnv.collectionService.update({
                    id: crypto.randomUUID(),
                    userId: user.id,
                    name: 'Updated Collection',
                }),
            ).rejects.toThrow('Collection not found');
        });

        test('Throws if updated collection name already exists for user', async () => {
            await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'Existing Collection',
            });

            const collection = await testEnv.collectionService.createCollection({
                userId: user.id,
                name: 'My Collection',
            });

            await expect(
                testEnv.collectionService.update({
                    id: collection.id,
                    userId: user.id,
                    name: 'Existing Collection',
                }),
            ).rejects.toThrow('Cannot update collection');

            const dbCollection = await testEnv.db.collection.findUnique({
                where: { id: collection.id },
            });

            expect(dbCollection!.name).toBe('My Collection');
        });
    });
});
