import { createTestInfrastructure, InfraStructure } from '__tests__/setup/infrastructure';
import { createPlaylistServiceFixture } from '__tests__/setup/integration';
import { buildPlaylistInput } from '__tests__/shared/factories';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { mockVideoMetadataService } from '__tests__/shared/mocks/services';
import {
    seedPlaylist,
    seedPlaylists,
    seedPlaylistWithVideos,
    seedUser,
    seedVideo,
    seedVideoWithSource,
} from '__tests__/shared/seeds/seeds';
import { randomUUID } from 'crypto';
import { PlaylistService } from 'features/playlist/services/playlistService';
import { PlaylistCreateData } from 'features/playlist/types';
import { User } from 'features/user/types';

let testEnv: InfraStructure & { playlistService: PlaylistService };
let user: User;
let playlistInput: PlaylistCreateData;

beforeAll(async () => {
    const infra = await createTestInfrastructure();
    const playlistService = createPlaylistServiceFixture({
        ...infra,
        videoMetadataService: mockVideoMetadataService,
    });
    testEnv = { ...infra, playlistService };
});

beforeEach(async () => {
    await truncateDbTables(testEnv.db);
    user = await seedUser(testEnv.db);
    const input = buildPlaylistInput();
    playlistInput = { name: input.name, description: input.description };
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('Playlist service integration tests', () => {
    describe('Create', () => {
        test('Should create a playlist', async () => {
            const playlist = await testEnv.playlistService.create(user.id, playlistInput);
            expect(playlist).toBeDefined();

            const dbPlaylist = await testEnv.db.playlist.findFirst({
                where: {
                    id: playlist.id,
                    userId: user.id,
                    name: playlistInput.name,
                    description: playlistInput.description,
                },
            });
            expect(dbPlaylist).not.toBeNull();
        });
        test('Should throw Not Found error if user does not exist', async () => {
            await expect(
                testEnv.playlistService.create(randomUUID(), playlistInput),
            ).rejects.toThrow('User not found');
            const playlists = await testEnv.db.playlist.findMany();
            expect(playlists).toHaveLength(0);
        });
        test('Should throw conflict error if user already has playlist with that name', async () => {
            await testEnv.playlistService.create(user.id, playlistInput);
            await expect(testEnv.playlistService.create(user.id, playlistInput)).rejects.toThrow(
                'You have another playlist with this name',
            );
            const playlists = await testEnv.db.playlist.findMany();
            expect(playlists).toHaveLength(1);
        });
    });
    describe('Get user playlists', () => {
        test('Should return playlist belonging to user', async () => {
            const dbPlaylists = await seedPlaylists(testEnv.db, 2, [
                { userId: user.id },
                { userId: user.id },
            ]);
            const playlists = await testEnv.playlistService.getUserPlaylists(user.id);
            expect(playlists).toHaveLength(2);
            expect(playlists).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        userId: user.id,
                        id: dbPlaylists[1].id,
                    }),
                    expect.objectContaining({
                        userId: user.id,
                        id: dbPlaylists[0].id,
                    }),
                ]),
            );
        });
        test('Should not return playlists belonging to another user', async () => {
            const user2 = await seedUser(testEnv.db);
            await seedPlaylists(testEnv.db, 2, [
                { userId: user.id, ...playlistInput },
                { userId: user2.id },
            ]);
            const playlists = await testEnv.playlistService.getUserPlaylists(user.id);
            expect(playlists).toHaveLength(1);
            expect(playlists[0]).toMatchObject({
                userId: user.id,
                name: playlistInput.name,
            });
        });
    });
    describe('Get playlist by id', () => {
        test('Should get playlist with videos', async () => {
            const customTitle = 'Custom title';
            const { playlist, playlistVideos, videos } = await seedPlaylistWithVideos(
                testEnv.db,
                user.id,
            );
            const sourcedVideo = await seedVideoWithSource({ db: testEnv.db });
            const sourcedPlaylistVideo = await testEnv.db.playlistVideo.create({
                data: { videoId: sourcedVideo.id, playlistId: playlist.id },
            });
            const updatedPlaylistvideo = await testEnv.db.playlistVideo.update({
                where: { id: playlistVideos[0].id },
                data: { customTitle },
            });
            playlistVideos[0] = updatedPlaylistvideo;
            playlistVideos.push(sourcedPlaylistVideo);

            const result = await testEnv.playlistService.getPlaylistById(user.id, playlist.id);

            expect(result).toMatchObject({
                id: playlist.id,
                name: playlist.name,
                videos: expect.any(Array),
            });

            expect(result.videos).toHaveLength(4);

            expect(result.videos).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: playlistVideos[0].id,
                        title: customTitle,
                        url: videos[0].url,
                    }),

                    expect.objectContaining({
                        id: playlistVideos[3].id,
                        title: sourcedVideo.source?.title,
                        description: sourcedVideo.source?.description,
                        thumbnail: sourcedVideo.source?.thumbnail,
                        platform: sourcedVideo.source?.platform,
                        platformId: sourcedVideo.source?.platformId,
                        url: sourcedVideo.source?.canonicalUrl,
                    }),
                    expect.objectContaining({
                        id: playlistVideos[1].id,
                        url: videos[1].url,
                    }),
                    expect.objectContaining({
                        id: playlistVideos[2].id,
                        url: videos[2].url,
                    }),
                ]),
            );
        });
        test('Should throw not found error if playlist belongs to another user', async () => {
            const user2 = await seedUser(testEnv.db);
            const playlist = await seedPlaylist(testEnv.db, { userId: user2.id });
            await expect(
                testEnv.playlistService.getPlaylistById(user.id, playlist.id),
            ).rejects.toThrow('Playlist not found');
        });
        test('Should throw not found error if playlist id does not exist', async () => {
            await expect(
                testEnv.playlistService.getPlaylistById(user.id, randomUUID()),
            ).rejects.toThrow('Playlist not found');
        });
    });
    describe('Update', () => {
        test('Should update playlist', async () => {
            const playlist = await seedPlaylist(testEnv.db, { userId: user.id });
            await testEnv.playlistService.update(user.id, playlist.id, {
                name: playlistInput.name,
            });
            const dbPlaylist = await testEnv.db.playlist.findUnique({
                where: { userId_name: { name: playlistInput.name, userId: user.id } },
            });
            expect(dbPlaylist).not.toBeNull();
        });
        test('Should throw not found error if playlist belongs to another user', async () => {
            const user2 = await seedUser(testEnv.db);
            const playlist = await seedPlaylist(testEnv.db, { userId: user2.id });
            await expect(
                testEnv.playlistService.update(user.id, playlist.id, {
                    description: playlistInput.description,
                }),
            ).rejects.toThrow('Playlist not found');
        });
        test('Should throw not found error if playlist id does not exist', async () => {
            await expect(
                testEnv.playlistService.update(user.id, randomUUID(), {
                    description: playlistInput.description,
                }),
            ).rejects.toThrow('Playlist not found');
        });
        test('Should throw conflict error if playlist with updated name already exists for user', async () => {
            await seedPlaylist(testEnv.db, {
                userId: user.id,
                name: playlistInput.name,
            });
            const playlist = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });
            await expect(
                testEnv.playlistService.update(user.id, playlist.id, {
                    name: playlistInput.name,
                }),
            ).rejects.toThrow('You have another playlist with this name');
        });
    });
    describe('Remove', () => {
        test('Should remove playlist and playlist videos but keep shared videos', async () => {
            const { playlist } = await seedPlaylistWithVideos(testEnv.db, user.id);

            const playlist2 = await seedPlaylist(testEnv.db, { userId: user.id });
            const video = await seedVideo(testEnv.db);

            const playlistVideo2 = await testEnv.db.playlistVideo.create({
                data: {
                    videoId: video.id,
                    playlistId: playlist2.id,
                },
            });

            await testEnv.playlistService.remove(user.id, playlist.id);

            expect(await testEnv.db.playlist.findUnique({ where: { id: playlist.id } })).toBeNull();

            expect(
                await testEnv.db.playlist.findUnique({ where: { id: playlist2.id } }),
            ).not.toBeNull();

            expect(
                await testEnv.db.playlistVideo.findUnique({ where: { id: playlistVideo2.id } }),
            ).not.toBeNull();

            expect(await testEnv.db.video.findUnique({ where: { id: video.id } })).not.toBeNull();
        });
        test('Should throw not found error if playlist belongs to another user', async () => {
            const user2 = await seedUser(testEnv.db);
            const playlist = await seedPlaylist(testEnv.db, { userId: user2.id });
            await expect(testEnv.playlistService.remove(user.id, playlist.id)).rejects.toThrow(
                'Playlist not found',
            );
        });
        test('Should throw not found error if playlist id does not exists', async () => {
            await expect(testEnv.playlistService.remove(user.id, randomUUID())).rejects.toThrow(
                'Playlist not found',
            );
        });
    });
    describe('Add video', () => {
        test('Should add video to playlist', async () => {
            const playlist = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            const result = await testEnv.playlistService.addVideo(user.id, {
                playlistId: playlist.id,
                url: 'https://www.youtube.com/watch?v=A8qAG797dgQ',
            });

            expect(result).toBeDefined();

            const playlistVideo = await testEnv.db.playlistVideo.findUnique({
                where: {
                    id: result.id,
                },
            });

            expect(playlistVideo).not.toBeNull();
            expect(playlistVideo?.playlistId).toBe(playlist.id);
        });

        test('Should throw not found error if playlist belongs to another user', async () => {
            const otherUser = await seedUser(testEnv.db);

            const playlist = await seedPlaylist(testEnv.db, {
                userId: otherUser.id,
            });

            await expect(
                testEnv.playlistService.addVideo(user.id, {
                    playlistId: playlist.id,
                    url: 'https://www.youtube.com/watch?v=A8qAG797dgQ',
                }),
            ).rejects.toThrow('Playlist not found');
        });

        test('Should throw not found error if playlist does not exist', async () => {
            await expect(
                testEnv.playlistService.addVideo(user.id, {
                    playlistId: randomUUID(),
                    url: 'https://www.youtube.com/watch?v=A8qAG797dgQ',
                }),
            ).rejects.toThrow('Playlist not found');
        });

        test('Should throw conflict error if video already exists in playlist', async () => {
            const playlist = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            const video = await seedVideoWithSource({
                db: testEnv.db,
            });

            await testEnv.db.playlistVideo.create({
                data: {
                    playlistId: playlist.id,
                    videoId: video.id,
                },
            });

            await expect(
                testEnv.playlistService.addVideo(user.id, {
                    playlistId: playlist.id,
                    url: video.url,
                }),
            ).rejects.toThrow('already in use');

            expect(
                await testEnv.db.playlistVideo.findMany({
                    where: {
                        playlistId: playlist.id,
                    },
                }),
            ).toHaveLength(1);
        });
    });
    describe('Update video', () => {
        test('Should update video in playlist', async () => {
            const { playlist, playlistVideos } = await seedPlaylistWithVideos(testEnv.db, user.id);

            const customTitle = 'Updated title';

            const result = await testEnv.playlistService.updateVideo(user.id, {
                playlistId: playlist.id,
                playlistVideoId: playlistVideos[0].id,
                data: {
                    customTitle,
                },
            });

            expect(result).toMatchObject({
                id: playlistVideos[0].id,
                title: customTitle,
            });

            const dbPlaylistVideo = await testEnv.db.playlistVideo.findUnique({
                where: {
                    id: playlistVideos[0].id,
                },
            });

            expect(dbPlaylistVideo?.customTitle).toBe(customTitle);
        });

        test('Should throw not found error if playlist belongs to another user', async () => {
            const otherUser = await seedUser(testEnv.db);

            const { playlistVideos } = await seedPlaylistWithVideos(testEnv.db, otherUser.id);

            const playlist = await testEnv.db.playlist.findUniqueOrThrow({
                where: {
                    id: playlistVideos[0].playlistId,
                },
            });

            await expect(
                testEnv.playlistService.updateVideo(user.id, {
                    playlistId: playlist.id,
                    playlistVideoId: playlistVideos[0].id,
                    data: {
                        customTitle: 'Updated title',
                    },
                }),
            ).rejects.toThrow('Playlist not found');
        });

        test('Should not update video belonging to another playlist', async () => {
            const playlist1 = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            const playlist2 = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            const video = await seedVideo(testEnv.db);

            const playlistVideo = await testEnv.db.playlistVideo.create({
                data: {
                    playlistId: playlist1.id,
                    videoId: video.id,
                },
            });

            await expect(
                testEnv.playlistService.updateVideo(user.id, {
                    playlistId: playlist2.id,
                    playlistVideoId: playlistVideo.id,
                    data: {
                        customTitle: 'Should fail',
                    },
                }),
            ).rejects.toThrow('Playlist video not found');

            const unchanged = await testEnv.db.playlistVideo.findUnique({
                where: {
                    id: playlistVideo.id,
                },
            });

            expect(unchanged?.customTitle).toBeNull();
        });

        test('Should throw not found error if video does not exist in playlist', async () => {
            const playlist = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            await expect(
                testEnv.playlistService.updateVideo(user.id, {
                    playlistId: playlist.id,
                    playlistVideoId: randomUUID(),
                    data: {
                        customTitle: 'Updated title',
                    },
                }),
            ).rejects.toThrow('Playlist video not found');
        });
    });
    describe('Remove video', () => {
        test('Should remove video from playlist but keep shared video resource', async () => {
            const { playlist, playlistVideos } = await seedPlaylistWithVideos(testEnv.db, user.id);

            const playlistVideo = playlistVideos[0];

            await testEnv.playlistService.removeVideo(user.id, {
                playlistId: playlist.id,
                playlistVideoId: playlistVideo.id,
            });

            expect(
                await testEnv.db.playlistVideo.findUnique({
                    where: {
                        id: playlistVideo.id,
                    },
                }),
            ).toBeNull();

            expect(
                await testEnv.db.video.findUnique({
                    where: {
                        id: playlistVideo.videoId,
                    },
                }),
            ).not.toBeNull();
        });

        test('Should not remove video belonging to another playlist', async () => {
            const playlist1 = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            const playlist2 = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            const video = await seedVideo(testEnv.db);

            const playlistVideo = await testEnv.db.playlistVideo.create({
                data: {
                    playlistId: playlist1.id,
                    videoId: video.id,
                },
            });

            await expect(
                testEnv.playlistService.removeVideo(user.id, {
                    playlistId: playlist2.id,
                    playlistVideoId: playlistVideo.id,
                }),
            ).rejects.toThrow('Playlist or video not found');

            expect(
                await testEnv.db.playlistVideo.findUnique({
                    where: {
                        id: playlistVideo.id,
                    },
                }),
            ).not.toBeNull();
        });

        test('Should throw not found error if playlist belongs to another user', async () => {
            const otherUser = await seedUser(testEnv.db);

            const { playlist, playlistVideos } = await seedPlaylistWithVideos(
                testEnv.db,
                otherUser.id,
            );

            await expect(
                testEnv.playlistService.removeVideo(user.id, {
                    playlistId: playlist.id,
                    playlistVideoId: playlistVideos[0].id,
                }),
            ).rejects.toThrow('Playlist not found');

            expect(
                await testEnv.db.playlistVideo.findUnique({
                    where: {
                        id: playlistVideos[0].id,
                    },
                }),
            ).not.toBeNull();
        });

        test('Should throw not found error if video does not exist in playlist', async () => {
            const playlist = await seedPlaylist(testEnv.db, {
                userId: user.id,
            });

            await expect(
                testEnv.playlistService.removeVideo(user.id, {
                    playlistId: playlist.id,
                    playlistVideoId: randomUUID(),
                }),
            ).rejects.toThrow('Playlist or video not found');
        });
    });
});
