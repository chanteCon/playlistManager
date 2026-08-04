import { PlaylistVideoRepo } from 'features/playlist/repos/playlistVideoRepo';

export const mockPlaylistVideoRepo: jest.Mocked<PlaylistVideoRepo> = {
    create: jest.fn(),
    update: jest.fn(),
    deleteFromPlaylist: jest.fn(),
};
