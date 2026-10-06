import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import {
    seedPlaylist,
    seedPlaylistVideo,
    seedPlaylistWithVideos,
    seedUsers,
    seedVideo,
    seedVideoWithSource,
} from '__tests__/shared/seeds/seeds';
import { User } from 'features/user/types';
import * as jwt from 'jsonwebtoken';
import { setAuthHeader } from '../helpers/e2eTestHelpers';
import { expectResError } from '../helpers/e2eAssertions';
import request from 'supertest';
import {
    BadInputError,
    ConflictError,
    NotFoundError,
    UnauthorisedError,
    ValidationError,
} from 'shared/errors/errors';
import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { playlistPaths } from 'routes/path';
import { randomUUID } from 'node:crypto';

let testEnv: TestAppEnv;
let users: User[];
let user: User;
let accessToken: string;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

beforeEach(async () => {
    await truncateDbTables(testEnv.db);
    await testEnv.redis.flushDb();
    users = await seedUsers(testEnv.db, 2, [{ verified: true }, { verified: true }]);
    user = users[0];
    accessToken = jwt.sign({ id: user.id }, process.env.ACCESS_TOKEN_SECRET!, {
        expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN),
    });
});

describe('e2e tests Playlist Routes', () => {
    describe('Create Playlist', () => {
        test('Authenticated user can create a new playlist', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).post(playlistPaths.base),
                accessToken,
            }).send({ name: 'My Playlist' });

            expect(res.status).toBe(201);

            expect(res.body.data).toMatchObject({
                playlist: {
                    name: 'My Playlist',
                    userId: user.id,
                },
            });
        });

        test('Should return conflict error (409) for duplicate user playlist name', async () => {
            const { app, db } = testEnv;

            await seedPlaylist(db, {
                userId: user.id,
                name: 'My Playlist',
            });

            const res = await setAuthHeader({
                req: request(app).post(playlistPaths.base),
                accessToken,
            }).send({ name: 'My Playlist' });

            expectResError({
                res,
                error: new ConflictError('Could not add playlist'),
                mockLogger,
            });
        });

        test('Should return bad request error (400) if playlist name is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).post(playlistPaths.base),
                accessToken,
            }).send({ name: '' });

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return unauthorised error (401) if user is not authenticated', async () => {
            const { app } = testEnv;

            const res = await request(app).post(playlistPaths.base).send({ name: 'My Playlist' });

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
    describe('Get playlist', () => {
        test('Should return playlist with videos for authenticated user', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });
            const video = await seedVideo(db);
            const playlistVideo = await seedPlaylistVideo(db, {
                videoId: video.id,
                playlistId: playlist.id,
            });

            const res = await setAuthHeader({
                req: request(app).get(playlistPaths.id(playlist.id)),
                accessToken,
            }).send();

            expect(res.status).toBe(200);

            expect(res.body.data).toMatchObject({
                playlist: {
                    id: playlist.id,
                    name: playlist.name,
                    description: playlist.description,
                    videos: [
                        expect.objectContaining({
                            id: playlistVideo.id,
                        }),
                    ],
                },
            });
        });

        test('Should return bad request error (400) if playlist id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).get(playlistPaths.id('invalid-id')),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return not found error (404) if playlist id does not exist for user', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).get(playlistPaths.id(crypto.randomUUID())),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });
        });

        test('Should return unauthorised error (401) if user is not authenticated', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await request(app).get(playlistPaths.id(playlist.id)).send();

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
    describe('Get all user playlists', () => {
        test('Should return all playlists belonging to user', async () => {
            const { app, db } = testEnv;

            const playlist1 = await seedPlaylist(db, {
                userId: user.id,
                name: 'Playlist 1',
            });

            const playlist2 = await seedPlaylist(db, {
                userId: user.id,
                name: 'Playlist 2',
            });

            const res = await setAuthHeader({
                req: request(app).get(playlistPaths.base),
                accessToken,
            }).send();

            expect(res.status).toBe(200);

            expect(res.body.data).toMatchObject({
                playlists: expect.arrayContaining([
                    expect.objectContaining({
                        id: playlist1.id,
                        name: 'Playlist 1',
                    }),
                    expect.objectContaining({
                        id: playlist2.id,
                        name: 'Playlist 2',
                    }),
                ]),
            });

            expect(res.body.data.playlists).toHaveLength(2);
        });

        test('Should return empty array if user has no playlists', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).get(playlistPaths.base),
                accessToken,
            }).send();

            expect(res.status).toBe(200);

            expect(res.body.data).toMatchObject({
                playlists: [],
            });
        });

        test('Should return unauthorised error (401) if user is not authenticated', async () => {
            const { app } = testEnv;

            const res = await request(app).get(playlistPaths.base).send();

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
    describe('Update playlist', () => {
        test('Should update playlist', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
                name: 'Old Name',
                description: 'Old description',
            });

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({
                name: 'Updated Name',
                description: 'Updated description',
            });

            expect(res.status).toBe(200);

            expect(res.body.data).toMatchObject({
                playlist: {
                    id: playlist.id,
                    name: 'Updated Name',
                    description: 'Updated description',
                    userId: user.id,
                },
            });
        });

        test('Should return bad request error (400) if playlist id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id('invalid-id')),
                accessToken,
            }).send({
                name: 'Updated Name',
            });

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return 400 if request body is invalid', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({
                name: '',
            });

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return not found (404) if playlist does not exist for user', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: users[1].id,
            });

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({
                name: 'Updated Name',
            });

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });
        });

        test('Should return conflict error (409) for duplicate playlist name', async () => {
            const { app, db } = testEnv;

            await seedPlaylist(db, {
                userId: user.id,
                name: 'Existing Playlist',
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
                name: 'Playlist To Update',
            });

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({
                name: 'Existing Playlist',
            });

            expectResError({
                res,
                error: new ConflictError('Could not update playlist'),
                mockLogger,
            });
        });

        test('Should return unauthorised error (401) if user is not authenticated', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await request(app).patch(playlistPaths.id(playlist.id)).send({
                name: 'Updated Name',
            });

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });

        test('Should update playlist cover image from video thumbnail', async () => {
            const { app, db } = testEnv;
            const playlist = await seedPlaylist(db, { userId: user.id });
            const video = await seedVideoWithSource({
                db,
                sourceOverrides: { thumbnail: 'https://example.com/thumbnail.jpg' },
            });
            const playlistVideo = await seedPlaylistVideo(db, {
                videoId: video.id,
                playlistId: playlist.id,
            });
            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({ cover: playlistVideo.id });
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({
                playlist: { id: playlist.id, coverUrl: 'https://example.com/thumbnail.jpg' },
            });
        });
        test('Should remove playlist cover image when cover video is null', async () => {
            const { app, db } = testEnv;
            const playlist = await seedPlaylist(db, {
                userId: user.id,
                coverUrl: 'https://example.com/existing-thumbnail.jpg',
            });
            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({ cover: null });
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({ playlist: { id: playlist.id, coverUrl: null } });
        });
        test('Should return not found (404) if cover video does not belong to playlist', async () => {
            const { app, db } = testEnv;
            const playlist = await seedPlaylist(db, { userId: user.id });
            const otherPlaylist = await seedPlaylist(db, { userId: user.id });
            const video = await seedVideoWithSource({
                db,
                sourceOverrides: { thumbnail: 'https://example.com/thumbnail.jpg' },
            });
            const playlistVideo = await seedPlaylistVideo(db, {
                videoId: video.id,
                playlistId: otherPlaylist.id,
            });
            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({ cover: playlistVideo.id });
            expectResError({
                res,
                error: new NotFoundError('Cannot set video as playlist cover image'),
                mockLogger,
            });
        });
        test('Should return not found (404) if cover video does not exist', async () => {
            const { app, db } = testEnv;
            const playlist = await seedPlaylist(db, { userId: user.id });
            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({ cover: crypto.randomUUID() });
            expectResError({
                res,
                error: new NotFoundError('Cannot set video as playlist cover image'),
                mockLogger,
            });
        });
        test('Should return bad request (400) if cover video does not have a thumbnail', async () => {
            const { app, db } = testEnv;
            const playlist = await seedPlaylist(db, { userId: user.id });
            const video = await seedVideoWithSource({ db, sourceOverrides: { thumbnail: null } });
            const playlistVideo = await seedPlaylistVideo(db, {
                videoId: video.id,
                playlistId: playlist.id,
            });
            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({ cover: playlistVideo.id });
            expectResError({
                res,
                error: new BadInputError('Cannot set video as playlist cover'),
                errors: [],
                mockLogger,
            });
        });
        test('Should return bad request (400) if cover video id is invalid format', async () => {
            const { app, db } = testEnv;
            const playlist = await seedPlaylist(db, { userId: user.id });
            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.id(playlist.id)),
                accessToken,
            }).send({ cover: 'invalid-id' });
            expectResError({
                res,
                error: new BadInputError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });
    });
    describe('Delete playlist', () => {
        test('Should remove playlist', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).delete(playlistPaths.id(playlist.id)),
                accessToken,
            }).send();

            expect(res.status).toBe(204);

            expect(
                await db.playlist.findUnique({
                    where: { id: playlist.id },
                }),
            ).toBeNull();
        });

        test('Should return not found (404) if playlist does not exist for user', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: users[1].id,
            });

            const res = await setAuthHeader({
                req: request(app).delete(playlistPaths.id(playlist.id)),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });
        });

        test('Should return bad request error (400) if playlist id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).delete(playlistPaths.id('invalid-id')),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return unauthorised error (401) if user is not authenticated', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await request(app).delete(playlistPaths.id(playlist.id)).send();

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
    describe('Update video positions', () => {
        test('Should update video positions', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const video1 = await seedVideo(db);
            const video2 = await seedVideo(db);
            const video3 = await seedVideo(db);

            const playlistVideo1 = await seedPlaylistVideo(
                db,
                {
                    videoId: video1.id,
                    playlistId: playlist.id,
                },
                0,
            );

            const playlistVideo2 = await seedPlaylistVideo(
                db,
                {
                    videoId: video2.id,
                    playlistId: playlist.id,
                },
                1,
            );

            const playlistVideo3 = await seedPlaylistVideo(
                db,
                {
                    videoId: video3.id,
                    playlistId: playlist.id,
                },
                2,
            );

            const res = await setAuthHeader({
                req: request(app).patch(`${playlistPaths.id(playlist.id)}/videos/positions`),
                accessToken,
            }).send({
                positions: [
                    { id: playlistVideo1.id, position: 2 },
                    { id: playlistVideo2.id, position: 0 },
                    { id: playlistVideo3.id, position: 1 },
                ],
            });

            expect(res.status).toBe(200);

            const updatedPlaylistVideos = await db.playlistVideo.findMany({
                where: {
                    playlistId: playlist.id,
                },
                orderBy: {
                    position: 'asc',
                },
            });

            expect(
                updatedPlaylistVideos.map(({ id, position }) => ({
                    id,
                    position,
                })),
            ).toEqual([
                { id: playlistVideo2.id, position: 0 },
                { id: playlistVideo3.id, position: 1 },
                { id: playlistVideo1.id, position: 2 },
            ]);
        });

        test('Should return not found (404) if playlist does not belong to user', async () => {
            const { app, db } = testEnv;

            const otherPlaylist = await seedPlaylist(db, {
                userId: users[1].id,
            });

            const video1 = await seedVideo(db);
            const video2 = await seedVideo(db);
            const video3 = await seedVideo(db);

            const playlistVideo1 = await seedPlaylistVideo(
                db,
                {
                    videoId: video1.id,
                    playlistId: otherPlaylist.id,
                },
                0,
            );

            const playlistVideo2 = await seedPlaylistVideo(
                db,
                {
                    videoId: video2.id,
                    playlistId: otherPlaylist.id,
                },
                1,
            );

            const playlistVideo3 = await seedPlaylistVideo(
                db,
                {
                    videoId: video3.id,
                    playlistId: otherPlaylist.id,
                },
                2,
            );

            const res = await setAuthHeader({
                req: request(app).patch(`${playlistPaths.id(otherPlaylist.id)}/videos/positions`),
                accessToken,
            }).send({
                positions: [
                    { id: playlistVideo1.id, position: 2 },
                    { id: playlistVideo2.id, position: 0 },
                    { id: playlistVideo3.id, position: 1 },
                ],
            });

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });

            const unchanged = await db.playlistVideo.findMany({
                where: {
                    playlistId: otherPlaylist.id,
                },
                orderBy: {
                    position: 'asc',
                },
            });

            expect(
                unchanged.map(({ id, position }) => ({
                    id,
                    position,
                })),
            ).toEqual([
                { id: playlistVideo1.id, position: 0 },
                { id: playlistVideo2.id, position: 1 },
                { id: playlistVideo3.id, position: 2 },
            ]);
        });

        test('Should return bad request (400) if video does not belong to playlist', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const otherPlaylist = await seedPlaylist(db, {
                userId: user.id,
            });

            const playlistVideo = await seedPlaylistVideo(
                db,
                {
                    videoId: (await seedVideo(db)).id,
                    playlistId: otherPlaylist.id,
                },
                0,
            );

            const res = await setAuthHeader({
                req: request(app).patch(`${playlistPaths.id(playlist.id)}/videos/positions`),
                accessToken,
            }).send({
                positions: [
                    {
                        id: playlistVideo.id,
                        position: 0,
                    },
                ],
            });

            expectResError({
                res,
                error: new BadInputError('Invalid Input'),
                mockLogger,
            });
        });

        test('Should return bad request (400) if not all positions are provided', async () => {
            const { app, db } = testEnv;

            const { playlist, playlistVideos } = await seedPlaylistWithVideos(db, user.id);

            const res = await setAuthHeader({
                req: request(app).patch(`${playlistPaths.id(playlist.id)}/videos/positions`),
                accessToken,
            }).send({
                positions: [
                    {
                        id: playlistVideos[0].id,
                        position: 0,
                    },
                ],
            });

            expectResError({
                res,
                error: new BadInputError('Invalid Input'),
                mockLogger,
            });
        });

        test('Should return unauthorised error (401) if user is not authenticated', async () => {
            const { app } = testEnv;

            const res = await request(app)
                .patch(`${playlistPaths.id(randomUUID())}/videos/positions`)
                .send({
                    positions: [],
                });

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
});
