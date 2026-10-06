import { CollectionService } from 'features/collections/collectionsService';

export const mockCollectionService = {
    createCollection: jest.fn(),
    update: jest.fn(),
    deleteCollection: jest.fn(),
    addPlaylist: jest.fn(),
    deletePlaylist: jest.fn(),
    getUserCollections: jest.fn(),
    getById: jest.fn(),
} as jest.Mocked<CollectionService>;
