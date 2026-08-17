import { PlaylistService } from 'features/playlist/services/playlistService';

export const mockPlaylistService: jest.Mocked<PlaylistService> = {
    create: jest.fn(),
    getUserPlaylists: jest.fn(),
    getPlaylistById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeVideo: jest.fn(),
    updateVideo: jest.fn(),
    addVideo: jest.fn(),
};
