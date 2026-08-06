import {
    buildPlaylist,
    buildPlaylistVideoInclude,
    buildPlaylistWithVideos,
} from '__tests__/shared/factories';
import { mockPlaylistRepo } from '__tests__/shared/mocks/repos/mockPlaylistRepo';
import { mockPlaylistVideoRepo } from '__tests__/shared/mocks/repos/mockPlaylistVideoRepo';
import { mockVideoService } from '__tests__/shared/mocks/services/mockVideoService';
import { randomUUID } from 'crypto';
import { createPlaylistService } from 'features/playlist/services/playlistService';
import { Playlist, PlaylistDTO, PlaylistVideoDTO } from 'features/playlist/types';
import { NotFoundError } from 'shared/errors/errors';

const playlistService = createPlaylistService({
    playlistRepo: mockPlaylistRepo,
    playlistVideoRepo: mockPlaylistVideoRepo,
    videoService: mockVideoService,
});
let playlist: Playlist;
const expectPlaylistDTO = (result: PlaylistDTO, expected: Playlist) => {
    expect(result.id).toEqual(expected.id);
    expect(result.name).toEqual(expected.name);
    expect(result.description).toEqual(expected.description);
};
const expectPlaylistVideoDTO = (
    resultVideo: PlaylistVideoDTO,
    expected: Partial<PlaylistVideoDTO>,
) => {
    expect(resultVideo).toMatchObject(expected);
};

describe('Unit tests: playlist service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        playlist = buildPlaylist();
    });
    describe('create', () => {
        test('Should create playlist', async () => {
            mockPlaylistRepo.create.mockResolvedValueOnce(playlist);
            const userId = playlist.userId;
            const data = {
                name: playlist.name,
                description: playlist.description ?? undefined,
            };
            const response = await playlistService.create(userId, data);
            expect(mockPlaylistRepo.create).toHaveBeenCalledWith({ userId, ...data });
            expect(response).toEqual(playlist);
        });
    });
    describe('getUserPlaylists', () => {
        test('Returns all user playlists', async () => {
            mockPlaylistRepo.findUserPlaylists.mockResolvedValueOnce([playlist]);
            const result = await playlistService.getUserPlaylists(playlist.userId);
            expect(mockPlaylistRepo.findUserPlaylists).toHaveBeenCalledWith(playlist.userId);
            expect(result).toEqual([playlist]);
        });
    });
    describe('getPlaylistById', () => {
        test('Should return playlist DTO for playlist matching id', async () => {
            const savedPlaylist = buildPlaylistWithVideos({}, 0);
            mockPlaylistRepo.findById.mockResolvedValueOnce(savedPlaylist);
            const result = await playlistService.getPlaylistById(
                savedPlaylist.userId,
                savedPlaylist.id,
            );
            expect(mockPlaylistRepo.findById).toHaveBeenCalledWith(
                savedPlaylist.id,
                savedPlaylist.userId,
            );
            expectPlaylistDTO(result, savedPlaylist);
            expect(result.videos).toEqual([]);
        });
        test('should return playlist DTO with custom video metadata overriding source', async () => {
            const customTitle = 'custom video title';
            const customDescription = 'custom video description';
            const playlistVideoOverrides = [
                {
                    customTitle,
                    customDescription,
                },
            ];
            const savedPlaylist = buildPlaylistWithVideos(
                {
                    playlistVideoOverrides,
                },
                1,
            );
            mockPlaylistRepo.findById.mockResolvedValueOnce(savedPlaylist);
            const result = await playlistService.getPlaylistById(
                savedPlaylist.userId,
                savedPlaylist.id,
            );
            expectPlaylistDTO(result, savedPlaylist);

            const videos = result.videos;
            expect(videos.length).toBe(1);
            const savedVideo = savedPlaylist.playlistVideos[0].video;

            expectPlaylistVideoDTO(result.videos[0], {
                id: savedPlaylist.playlistVideos[0].id,
                title: customTitle,
                description: customDescription,
                url: savedVideo.source?.canonicalUrl,
                platform: savedVideo.source?.platform,
                render: true,
            });
        });

        test('should return playlist DTO using source metadata when custom metadata is missing', async () => {
            const savedPlaylist = buildPlaylistWithVideos({}, 1);
            mockPlaylistRepo.findById.mockResolvedValueOnce(savedPlaylist);
            const result = await playlistService.getPlaylistById(
                savedPlaylist.userId,
                savedPlaylist.id,
            );
            expectPlaylistDTO(result, savedPlaylist);

            const videos = result.videos;
            expect(videos.length).toBe(1);
            const savedVideo = savedPlaylist.playlistVideos[0].video;

            expectPlaylistVideoDTO(result.videos[0], {
                id: savedPlaylist.playlistVideos[0].id,
                title: savedVideo.source!.title!,
                description: savedVideo.source!.description!,
                url: savedVideo.source?.canonicalUrl,
                platform: savedVideo.source?.platform,
                render: true,
            });
        });

        test('should return playlist DTO with defaults when video has no source', async () => {
            const videoOverrides = [{ source: null, sourceId: null }];
            const savedPlaylist = buildPlaylistWithVideos({ videoOverrides }, 1);
            mockPlaylistRepo.findById.mockResolvedValueOnce(savedPlaylist);
            const result = await playlistService.getPlaylistById(
                savedPlaylist.userId,
                savedPlaylist.id,
            );
            expectPlaylistDTO(result, savedPlaylist);

            const videos = result.videos;
            expect(videos.length).toBe(1);
            const savedVideo = savedPlaylist.playlistVideos[0].video;

            expectPlaylistVideoDTO(result.videos[0], {
                id: savedPlaylist.playlistVideos[0].id,
                title: '',
                description: '',
                url: savedVideo.url,
                platform: null,
                render: false,
            });
        });
        test('Throws error if playlist does not exist', async () => {
            mockPlaylistRepo.findById.mockResolvedValueOnce(null);
            await expect(
                playlistService.getPlaylistById(randomUUID(), randomUUID()),
            ).rejects.toThrow(new NotFoundError('Playlist not found'));
        });
    });
    describe('update', () => {
        test('Should update playlist', async () => {
            mockPlaylistRepo.update.mockResolvedValueOnce(playlist);
            const result = await playlistService.update(playlist.userId, playlist.id, {
                name: playlist.name,
            });
            expect(result).toEqual(playlist);
            expect(mockPlaylistRepo.update).toHaveBeenCalledTimes(1);
        });
    });
    describe('remove', () => {
        test('Should remove playlist by id', async () => {
            mockPlaylistRepo.deleteById.mockResolvedValueOnce(playlist);
            const result = await playlistService.remove(playlist.userId, playlist.id);
            expect(result).toEqual(playlist);
            expect(mockPlaylistRepo.deleteById).toHaveBeenCalledTimes(1);
        });
    });
    // TODO playlist service unit tests for playlist videos
    describe('addVideo', () => {
        test('Should add a video to users playlist', async () => {
            const savedVideo = buildPlaylistVideoInclude({
                playlistVideoOverrides: { id: playlist.id },
            });
            mockPlaylistVideoRepo.create.mockResolvedValueOnce(savedVideo);
            mockPlaylistRepo.existsForUser.mockResolvedValueOnce(true);
            mockVideoService.addFromUrl.mockResolvedValueOnce(savedVideo.video);
            const data = { playlistId: playlist.id, url: savedVideo.video.url };
            const result = await playlistService.addVideo(playlist.userId, data);
            expect(mockPlaylistVideoRepo.create).toHaveBeenCalledWith(
                playlist.id,
                savedVideo.video.id,
            );
            expect(mockPlaylistRepo.existsForUser).toHaveBeenCalledWith(
                playlist.id,
                playlist.userId,
            );
            const savedSource = savedVideo.video.source!;
            expectPlaylistVideoDTO(result, {
                id: savedVideo.id,
                title: savedSource.title!,
                description: savedSource.description!,
                url: savedSource.canonicalUrl,
                platform: savedSource.platform,
                render: true,
            });
        });
        test('Should throw error if playlist does not exist for user', async () => {
            mockPlaylistRepo.existsForUser.mockResolvedValueOnce(false);
            await expect(
                playlistService.addVideo(playlist.userId, {
                    playlistId: playlist.id,
                    url: 'test-url',
                }),
            ).rejects.toThrow('Playlist not found');
            expect(mockPlaylistVideoRepo.create).toHaveBeenCalledTimes(0);
            expect(mockVideoService.addFromUrl).toHaveBeenCalledTimes(0);
        });
    });
    describe('updateVideo', () => {
        test('Should update video in users playlist and return updated playlist video DTO', async () => {
            const savedVideo = buildPlaylistVideoInclude({
                playlistVideoOverrides: {
                    playlistId: playlist.id,
                    customTitle: 'updated title',
                    customDescription: 'updated description',
                },
            });

            const updateData = {
                customTitle: 'updated title',
                customDescription: 'updated description',
            };

            mockPlaylistRepo.existsForUser.mockResolvedValueOnce(true);
            mockPlaylistVideoRepo.update.mockResolvedValueOnce(savedVideo);
            const input = {
                playlistId: playlist.id,
                playlistVideoId: savedVideo.id,
                data: updateData,
            };
            const result = await playlistService.updateVideo(playlist.userId, input);

            expect(mockPlaylistRepo.existsForUser).toHaveBeenCalledWith(
                playlist.id,
                playlist.userId,
            );

            expect(mockPlaylistVideoRepo.update).toHaveBeenCalledWith(
                savedVideo.id,
                playlist.id,
                updateData,
            );

            const savedSource = savedVideo.video.source!;

            expectPlaylistVideoDTO(result, {
                id: savedVideo.id,
                title: updateData.customTitle,
                description: updateData.customDescription,
                url: savedSource.canonicalUrl,
                platform: savedSource.platform,
                render: true,
            });
        });

        test('Should throw error if playlist does not exist for user', async () => {
            mockPlaylistRepo.existsForUser.mockResolvedValueOnce(false);
            const input = {
                playlistId: playlist.id,
                playlistVideoId: 'playlist-video-id',
                data: { customTitle: 'updated title' },
            };
            await expect(playlistService.updateVideo(playlist.userId, input)).rejects.toThrow(
                'Playlist not found',
            );

            expect(mockPlaylistVideoRepo.update).toHaveBeenCalledTimes(0);
        });
    });

    describe('removeVideo', () => {
        test('Should remove video in users playlist', async () => {
            mockPlaylistRepo.existsForUser.mockResolvedValueOnce(true);
            mockPlaylistVideoRepo.deleteFromPlaylist.mockResolvedValueOnce();

            await playlistService.removeVideo(playlist.userId, {
                playlistId: playlist.id,
                playlistVideoId: 'playlist-video-id',
            });

            expect(mockPlaylistRepo.existsForUser).toHaveBeenCalledWith(
                playlist.id,
                playlist.userId,
            );

            expect(mockPlaylistVideoRepo.deleteFromPlaylist).toHaveBeenCalledWith(
                playlist.id,
                'playlist-video-id',
            );
        });

        test('Should throw error if playlist does not exist for user', async () => {
            mockPlaylistRepo.existsForUser.mockResolvedValueOnce(false);

            await expect(
                playlistService.removeVideo(playlist.userId, {
                    playlistId: playlist.id,
                    playlistVideoId: 'playlist-video-id',
                }),
            ).rejects.toThrow('Playlist not found');

            expect(mockPlaylistVideoRepo.deleteFromPlaylist).toHaveBeenCalledTimes(0);
        });
    });
});
