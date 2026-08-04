import { PlaylistRepo } from 'features/playlist/repos/playlistRepo';

export const mockPlaylistRepo: jest.Mocked<PlaylistRepo> = {
    create: jest.fn(),
    existsForUser: jest.fn(),
    findUserPlaylists: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
};
