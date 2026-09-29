import {
    seedPlaylist,
    seedPlaylistVideo,
    seedUsers,
    seedVideoWithSource,
} from '__tests__/shared/seeds/seeds';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { setAuthHeader } from '../helpers/e2eTestHelpers';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { User } from 'features/user/types';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { searchPaths } from 'routes/path';
import { seedCollection, seedCollectionPlaylist } from '__tests__/shared/seeds/collectionSeeds';
import { expectResError } from '../helpers/e2eAssertions';
import { UnauthorisedError } from 'shared/errors/errors';
import { mockLogger } from '__tests__/shared/mocks/mockLogger';

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

describe('Search Routes', () => {
    describe('Search library', () => {
        test('Should return matching collections, playlists and videos', async () => {
            const { app, db } = testEnv;

            const collection = await seedCollection(db, {
                userId: user.id,
                name: 'Music Collection',
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
                name: 'Music Favourites',
                description: 'My favourite songs',
            });

            await seedCollectionPlaylist(db, {
                collectionId: collection.id,
                playlistId: playlist.id,
            });

            const video = await seedVideoWithSource({
                db,
                sourceOverrides: {
                    title: 'Music Video',
                },
            });

            const playlistVideo = await seedPlaylistVideo(db, {
                videoId: video.id,
                playlistId: playlist.id,
                customTitle: 'Best Music Videos',
            });

            const res = await setAuthHeader({
                req: request(app).get(searchPaths.base).query({ search: 'music' }),
                accessToken,
            }).send();

            expect(res.status).toBe(200);

            expect(res.body.data).toMatchObject({
                collections: [
                    expect.objectContaining({
                        id: collection.id,
                        name: 'Music Collection',
                        numPlaylists: 1,
                    }),
                ],
                playlists: [
                    expect.objectContaining({
                        id: playlist.id,
                        name: 'Music Favourites',
                        numVideos: 1,
                        videos: [
                            expect.objectContaining({
                                id: playlistVideo.id,
                                title: 'Best Music Videos',
                            }),
                        ],
                    }),
                ],
                videos: [
                    expect.objectContaining({
                        id: playlistVideo.id,
                        title: 'Best Music Videos',
                    }),
                ],
            });
        });

        test('Should not return results belonging to another user', async () => {
            const { app, db } = testEnv;

            await seedCollection(db, {
                userId: users[1].id,
                name: 'Music Collection',
            });

            const playlist = await seedPlaylist(db, {
                userId: users[1].id,
                name: 'Music Favourites',
            });

            const video = await seedVideoWithSource({
                db,
                sourceOverrides: {
                    title: 'Music Video',
                },
            });

            await seedPlaylistVideo(db, {
                videoId: video.id,
                playlistId: playlist.id,
                customTitle: 'Music Video',
            });

            const res = await setAuthHeader({
                req: request(app).get(searchPaths.base).query({ search: 'music' }),
                accessToken,
            }).send();

            expect(res.status).toBe(200);

            expect(res.body.data).toMatchObject({
                collections: [],
                playlists: [],
                videos: [],
            });
        });

        test('Should return empty results if search has no matches', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).get(searchPaths.base).query({ search: 'does-not-exist' }),
                accessToken,
            }).send();

            expect(res.status).toBe(200);

            expect(res.body.data).toMatchObject({
                collections: [],
                playlists: [],
                videos: [],
            });
        });

        test('Should return unauthorised error (401) if user is not authenticated', async () => {
            const { app } = testEnv;

            const res = await request(app).get(searchPaths.base).query({ search: 'music' }).send();

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
});
