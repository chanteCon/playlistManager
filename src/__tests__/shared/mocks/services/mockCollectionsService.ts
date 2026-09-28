import { CollectionService } from 'features/collectionsService';

export const mockCollectionService = {
    createCollection: jest.fn(),
    update: jest.fn(),
    deleteCollection: jest.fn(),
    addPlaylist: jest.fn(),
    deletePlaylist: jest.fn(),
} as jest.Mocked<CollectionService>;
