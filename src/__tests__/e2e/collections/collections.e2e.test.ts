import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { collectionPaths } from 'routes/path';
import { setAuthHeader } from '../helpers/e2eTestHelpers';
import request from 'supertest';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedPlaylist, seedUsers } from '__tests__/shared/seeds/seeds';
import { User } from 'features/user/types';
import * as jwt from 'jsonwebtoken';
import { expectResError } from '../helpers/e2eAssertions';
import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import {
    ConflictError,
    NotFoundError,
    UnauthorisedError,
    ValidationError,
} from 'shared/errors/errors';

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

describe('e2e tests Collection Routes', () => {
    describe('Create Collection', () => {
        test('Authenticated user can create a new collection', async () => {
            const { app, db } = testEnv;

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.base),
                accessToken,
            }).send({ name: 'My Collection' });

            expect(res.status).toBe(201);

            expect(res.body.data).toMatchObject({
                collection: {
                    name: 'My Collection',
                    userId: user.id,
                },
            });

            const collection = await db.collection.findUnique({
                where: {
                    id: res.body.data.collection.id,
                },
            });

            expect(collection).not.toBeNull();
        });

        test('Should return conflict error (409) for duplicate user collection name', async () => {
            const { app, db } = testEnv;

            await testEnv.db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.base),
                accessToken,
            }).send({ name: 'My Collection' });

            expectResError({
                res,
                error: new ConflictError('Cannot add collection'),
                mockLogger,
            });
        });

        test('Should allow different users to create collections with the same name', async () => {
            const { app, db } = testEnv;

            await db.collection.create({
                data: {
                    userId: users[1].id,
                    name: 'My Collection',
                },
            });

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.base),
                accessToken,
            }).send({ name: 'My Collection' });

            expect(res.status).toBe(201);

            expect(res.body.data.collection).toMatchObject({
                name: 'My Collection',
                userId: user.id,
            });
        });

        test('Should return bad request error (400) if collection name is invalid', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.base),
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

            const res = await request(app)
                .post(collectionPaths.base)
                .send({ name: 'My Collection' });

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });

    describe('Update Collection', () => {
        test('Should update collection', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'Old Name',
                },
            });

            const res = await setAuthHeader({
                req: request(app).patch(collectionPaths.id(collection.id)),
                accessToken,
            }).send({
                name: 'Updated Name',
            });

            expect(res.status).toBe(200);

            expect(res.body.data).toMatchObject({
                collection: {
                    id: collection.id,
                    name: 'Updated Name',
                    userId: user.id,
                },
            });
        });

        test('Should return bad request error (400) if collection id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).patch(collectionPaths.id('invalid-id')),
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

        test('Should return bad request error (400) if request body is invalid', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const res = await setAuthHeader({
                req: request(app).patch(collectionPaths.id(collection.id)),
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

        test('Should return not found (404) if collection does not exist for user', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).patch(collectionPaths.id(crypto.randomUUID())),
                accessToken,
            }).send({
                name: 'Updated Name',
            });

            expectResError({
                res,
                error: new NotFoundError('Collection not found'),
                mockLogger,
            });
        });

        test('Should return not found (404) if collection belongs to another user', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: users[1].id,
                    name: 'Other Collection',
                },
            });

            const res = await setAuthHeader({
                req: request(app).patch(collectionPaths.id(collection.id)),
                accessToken,
            }).send({
                name: 'Updated Name',
            });

            expectResError({
                res,
                error: new NotFoundError('Collection not found'),
                mockLogger,
            });
        });

        test('Should return conflict error (409) for duplicate collection name', async () => {
            const { app, db } = testEnv;

            await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'Existing Collection',
                },
            });

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'Collection To Update',
                },
            });

            const res = await setAuthHeader({
                req: request(app).patch(collectionPaths.id(collection.id)),
                accessToken,
            }).send({
                name: 'Existing Collection',
            });

            expectResError({
                res,
                error: new ConflictError('Cannot update collection'),
                mockLogger,
            });
        });

        test('Should return unauthorised error (401) if user is not authenticated', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const res = await request(app).patch(collectionPaths.id(collection.id)).send({
                name: 'Updated Name',
            });

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });

    describe('Delete Collection', () => {
        test('Should remove collection', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const res = await setAuthHeader({
                req: request(app).delete(collectionPaths.id(collection.id)),
                accessToken,
            }).send();

            expect(res.status).toBe(204);

            expect(
                await db.collection.findUnique({
                    where: { id: collection.id },
                }),
            ).toBeNull();
        });

        test('Should return not found (404) if collection does not exist for user', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).delete(collectionPaths.id(crypto.randomUUID())),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Collection not found'),
                mockLogger,
            });
        });

        test('Should return not found (404) if collection belongs to another user', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: users[1].id,
                    name: 'Other Collection',
                },
            });

            const res = await setAuthHeader({
                req: request(app).delete(collectionPaths.id(collection.id)),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Collection not found'),
                mockLogger,
            });
        });

        test('Should return bad request error (400) if collection id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).delete(collectionPaths.id('invalid-id')),
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

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const res = await request(app).delete(collectionPaths.id(collection.id)).send();

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });

    describe('Add Playlist', () => {
        test('Should add playlist to collection', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.playlist(collection.id, playlist.id)),
                accessToken,
            }).send();

            expect(res.status).toBe(204);

            const relation = await db.collectionPlaylist.findUnique({
                where: {
                    collectionId_playlistId: {
                        collectionId: collection.id,
                        playlistId: playlist.id,
                    },
                },
            });

            expect(relation).not.toBeNull();
        });

        test('Should return conflict error (409) if playlist is already in collection', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            await db.collectionPlaylist.create({
                data: {
                    collectionId: collection.id,
                    playlistId: playlist.id,
                },
            });

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.playlist(collection.id, playlist.id)),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new ConflictError('Cannot add playlist to collection'),
                mockLogger,
            });
        });

        test('Should return not found (404) if collection does not belong to user', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: users[1].id,
                    name: 'Other Collection',
                },
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.playlist(collection.id, playlist.id)),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Collection not found'),
                mockLogger,
            });
        });

        test('Should return not found (404) if playlist does not belong to user', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const playlist = await seedPlaylist(db, {
                userId: users[1].id,
            });

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.playlist(collection.id, playlist.id)),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });
        });

        test('Should return bad request error (400) if collection id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.playlist('invalid-id', crypto.randomUUID())),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return bad request error (400) if playlist id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).post(collectionPaths.playlist(crypto.randomUUID(), 'invalid-id')),
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

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await request(app)
                .post(collectionPaths.playlist(collection.id, playlist.id))
                .send();

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });

    describe('Delete Playlist', () => {
        test('Should remove playlist from collection', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            await db.collectionPlaylist.create({
                data: {
                    collectionId: collection.id,
                    playlistId: playlist.id,
                },
            });

            const res = await setAuthHeader({
                req: request(app).delete(collectionPaths.playlist(collection.id, playlist.id)),
                accessToken,
            }).send();

            expect(res.status).toBe(204);

            const relation = await db.collectionPlaylist.findUnique({
                where: {
                    collectionId_playlistId: {
                        collectionId: collection.id,
                        playlistId: playlist.id,
                    },
                },
            });

            expect(relation).toBeNull();
        });

        test('Should return not found (404) if playlist is not in collection', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).delete(collectionPaths.playlist(collection.id, playlist.id)),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Playlist not found'),
                mockLogger,
            });
        });

        test('Should return not found (404) if collection does not belong to user', async () => {
            const { app, db } = testEnv;

            const collection = await db.collection.create({
                data: {
                    userId: users[1].id,
                    name: 'Other Collection',
                },
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await setAuthHeader({
                req: request(app).delete(collectionPaths.playlist(collection.id, playlist.id)),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new NotFoundError('Collection not found'),
                mockLogger,
            });
        });

        test('Should return bad request error (400) if collection id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).delete(
                    collectionPaths.playlist('invalid-id', crypto.randomUUID()),
                ),
                accessToken,
            }).send();

            expectResError({
                res,
                error: new ValidationError('Invalid Input'),
                errors: [],
                mockLogger,
            });
        });

        test('Should return bad request error (400) if playlist id is invalid format', async () => {
            const { app } = testEnv;

            const res = await setAuthHeader({
                req: request(app).delete(
                    collectionPaths.playlist(crypto.randomUUID(), 'invalid-id'),
                ),
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

            const collection = await db.collection.create({
                data: {
                    userId: user.id,
                    name: 'My Collection',
                },
            });

            const playlist = await seedPlaylist(db, {
                userId: user.id,
            });

            const res = await request(app)
                .delete(collectionPaths.playlist(collection.id, playlist.id))
                .send();

            expectResError({
                res,
                error: new UnauthorisedError('Unauthorized'),
                mockLogger,
            });
        });
    });
});
