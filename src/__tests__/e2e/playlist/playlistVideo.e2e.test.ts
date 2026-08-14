jest.mock('features/video/services/videoMetadataService', () => ({
    createVideoMetadataService: jest.fn(() => ({
        getExternalData: jest.fn().mockResolvedValue({
            url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
            platformId: 'zzzzzzzzzzz',
            metadata: {
                title: 'Test Video',
                description: 'Test description',
                thumbnail: 'https://example.com/thumbnail.jpg',
            },
        }),
    })),
}));
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedPlaylist, seedUsers, seedVideo } from '__tests__/shared/seeds/seeds';
import { User } from 'features/user/types';
import * as jwt from 'jsonwebtoken';
import { setAuthHeader } from '../helpers/e2eTestHelpers';
import { expectResError } from '../helpers/e2eAssertions';
import request from 'supertest';
import {
    ConflictError,
    NotFoundError,
    UnauthorisedError,
    ValidationError,
} from 'shared/errors/errors';
import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { playlistPaths } from 'routes/path';
import { randomUUID } from 'crypto';

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
    //playlist videos
    describe('Add video', () => {
        test('Should add video to playlist and return playlist video DTO', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).post(playlistPaths.videoBase(playlist.id)),
                accessToken,
            }).send({
                url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
            });

            expect(res.status).toBe(201);
            expect(res.body.data).toMatchObject({
                video: {
                    url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
                    platform: 'youtube',
                    platformId: 'zzzzzzzzzzz',
                    title: 'Test Video',
                    description: 'Test description',
                    thumbnail: 'https://example.com/thumbnail.jpg',
                    render: expect.any(Boolean),
                },
            });
        });

        test('Should return not found (404) if playlist does not exist for user', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: users[1].id,
            });

            const res = await setAuthHeader({
                req: request(app).post(playlistPaths.videoBase(playlist.id)),
                accessToken,
            }).send({
                url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
            });

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });
        });

        test('Should return not found (404) if playlist does not exist', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).post(playlistPaths.videoBase(randomUUID())),
                accessToken,
            }).send({
                url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
            });

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });
        });

        test('Should return bad request error (400) if playlist id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).post(playlistPaths.videoBase('invalid-id')),
                accessToken,
            }).send({
                url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
            });

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return conflict error (409) for duplicate url', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const url = 'https://www.youtube.com/watch?v=zzzzzzzzzzz';

            const firstRes = await setAuthHeader({
                req: request(app).post(playlistPaths.videoBase(playlist.id)),
                accessToken,
            }).send({ url });

            expect(firstRes.status).toBe(201);

            const res = await setAuthHeader({
                req: request(app).post(playlistPaths.videoBase(playlist.id)),
                accessToken,
            }).send({ url });

            expectResError({
                res,
                error: new ConflictError('You have another playlist with this name'),
                mockLogger,
            });
        });

        test('Should return bad request error (400) if url is invalid format from request body', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).post(playlistPaths.videoBase(playlist.id)),
                accessToken,
            }).send({
                url: 'not-a-valid-url',
            });

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

            const res = await request(app).post(playlistPaths.videoBase(playlist.id)).send({
                url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
            });

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
    describe('Update video', () => {
        test('Should update playlist video', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const video = await seedVideo(db);

            const playlistVideo = await db.playlistVideo.create({
                data: {
                    playlistId: playlist.id,
                    videoId: video.id,
                },
            });

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.videoId(playlist.id, playlistVideo.id)),
                accessToken,
            }).send({
                customTitle: 'Updated title',
                render: true,
            });

            expect(res.status).toBe(200);

            expect(res.body.data).toMatchObject({
                video: {
                    id: playlistVideo.id,
                    title: 'Updated title',
                    render: false,
                },
            });
        });

        test('Should return not found (404) if playlist does not exist for user', async () => {
            const { app, db } = testEnv;

            const otherUserPlaylist = await seedPlaylist(db, {
                userId: users[1].id,
            });

            const video = await seedVideo(db);

            const playlistVideo = await db.playlistVideo.create({
                data: {
                    playlistId: otherUserPlaylist.id,
                    videoId: video.id,
                },
            });

            const res = await setAuthHeader({
                req: request(app).patch(
                    playlistPaths.videoId(otherUserPlaylist.id, playlistVideo.id),
                ),
                accessToken,
            }).send({
                customTitle: 'Updated title',
            });

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });
        });

        test('Should return not found (404) if video does not exist for user', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const otherUserPlaylist = await seedPlaylist(db, {
                userId: users[1].id,
            });

            const video = await seedVideo(db);

            const playlistVideo = await db.playlistVideo.create({
                data: {
                    playlistId: otherUserPlaylist.id,
                    videoId: video.id,
                },
            });

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.videoId(playlist.id, playlistVideo.id)),
                accessToken,
            }).send({
                customTitle: 'Updated title',
            });

            expectResError({
                res,
                error: new NotFoundError('Playlist video not found'),
                mockLogger,
            });
        });

        test('Should return bad request error (400) if playlist id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.videoId('invalid-id', 'valid-video-id')),
                accessToken,
            }).send({
                customTitle: 'Updated title',
            });

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return bad request error (400) if video id is invalid format', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.videoId(playlist.id, 'invalid-video-id')),
                accessToken,
            }).send({
                customTitle: 'Updated title',
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

            const video = await seedVideo(db);

            const playlistVideo = await db.playlistVideo.create({
                data: {
                    playlistId: playlist.id,
                    videoId: video.id,
                },
            });

            const res = await setAuthHeader({
                req: request(app).patch(playlistPaths.videoId(playlist.id, playlistVideo.id)),
                accessToken,
            }).send({
                render: true,
            });

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

            const video = await seedVideo(db);

            const playlistVideo = await db.playlistVideo.create({
                data: {
                    playlistId: playlist.id,
                    videoId: video.id,
                },
            });

            const res = await request(app)
                .patch(playlistPaths.videoId(playlist.id, playlistVideo.id))
                .send({
                    title: 'Updated title',
                });

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
    describe('Remove video', () => {
        test('Should remove playlist video', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const video = await seedVideo(db);

            const playlistVideo = await db.playlistVideo.create({
                data: {
                    playlistId: playlist.id,
                    videoId: video.id,
                },
            });

            const res = await setAuthHeader({
                req: request(app).delete(playlistPaths.videoId(playlist.id, playlistVideo.id)),
                accessToken,
            }).send();

            expect(res.status).toBe(204);

            expect(
                await db.playlistVideo.findUnique({
                    where: { id: playlistVideo.id },
                }),
            ).toBeNull();
        });

        test('Should return not found (404) if playlist does not exist for user', async () => {
            const { app, db } = testEnv;

            const otherUserPlaylist = await seedPlaylist(db, {
                userId: users[1].id,
            });

            const video = await seedVideo(db);

            const playlistVideo = await db.playlistVideo.create({
                data: {
                    playlistId: otherUserPlaylist.id,
                    videoId: video.id,
                },
            });

            const res = await setAuthHeader({
                req: request(app).delete(
                    playlistPaths.videoId(otherUserPlaylist.id, playlistVideo.id),
                ),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });
        });

        test('Should return not found (404) if video does not exist for user', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const otherUserPlaylist = await seedPlaylist(db, {
                userId: users[1].id,
            });

            const video = await seedVideo(db);

            const playlistVideo = await db.playlistVideo.create({
                data: {
                    playlistId: otherUserPlaylist.id,
                    videoId: video.id,
                },
            });

            const res = await setAuthHeader({
                req: request(app).delete(playlistPaths.videoId(playlist.id, playlistVideo.id)),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Playlist or video not found'),
                mockLogger,
            });
        });

        test('Should return bad request error (400) if playlist id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).delete(playlistPaths.videoId('invalid-id', 'invalid-id')),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return bad request error (400) if video id is invalid format', async () => {
            const { app, db } = testEnv;

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).delete(playlistPaths.videoId(playlist.id, 'invalid-id')),
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

            const video = await seedVideo(db);

            const playlistVideo = await db.playlistVideo.create({
                data: {
                    playlistId: playlist.id,
                    videoId: video.id,
                },
            });

            const res = await request(app)
                .delete(playlistPaths.videoId(playlist.id, playlistVideo.id))
                .send();

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
});
