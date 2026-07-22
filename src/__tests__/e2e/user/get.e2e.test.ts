import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import request from 'supertest';
import { BadInputError, NotFoundError } from 'shared/errors/errors';
import { expectResError, expectWrappedResponse } from '__tests__/e2e/helpers/e2eAssertions';
import { userPaths } from 'routes/path';
import { PublicUser, User } from 'features/user/types';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedUsers } from '__tests__/shared/seeds/seeds';
import { buildPublicUser } from '__tests__/shared/factories';
import { randomUUID } from 'crypto';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';

let users: User[];
let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: User Routes - public GET routes', () => {
    beforeEach(async () => {
        const { db } = testEnv;
        await truncateDbTables(db);
        await testEnv.redis.flushDb();
        jest.clearAllMocks();
        users = await seedUsers(db);
    });
    describe('Get user', () => {
        test('should return users details', async () => {
            const { app } = testEnv;
            const res1 = await request(app).get(`${userPaths.base}/${users[0].id}`);
            const res2 = await request(app).get(`${userPaths.base}/${users[1].id}`);

            expectWrappedResponse({ res: res1, data: { user: buildPublicUser(users[0]) } });
            expectWrappedResponse({ res: res2, data: { user: buildPublicUser(users[1]) } });
            expect(res2.body.data.user).toEqual(buildPublicUser(users[1]));
        });
        test('Should throw error (404 Not Found) if user does not exist', async () => {
            const { app } = testEnv;
            const res = await request(app).get(`${userPaths.base}/${randomUUID()}`);
            expectResError({ res, error: new NotFoundError('User not found'), mockLogger });
        });
        test('Should throw error (404 Not Found) if id is invalid type', async () => {
            const { app } = testEnv;
            const res = await request(app).get(`${userPaths.base}/123`);
            expectResError({ res, error: new BadInputError('Invalid Input'), mockLogger });
        });
    });
    describe('Get users', () => {
        const sortByUsername = (arr: PublicUser[]) => {
            return arr.sort((a, b) => a.username.localeCompare(b.username));
        };
        test('Should return all users', async () => {
            const { app } = testEnv;
            const res = await request(app).get(userPaths.base).send();
            expect(res.status).toEqual(200);
            const returnedUsers: PublicUser[] = res.body.data.users;
            const publicUsers = users.map((u) => buildPublicUser(u));
            expect(sortByUsername(returnedUsers)).toEqual(sortByUsername(publicUsers));
        });
        test('Should return empty array if no users in the db', async () => {
            const { app, db } = testEnv;
            await db.user.deleteMany();
            const res = await request(app).get(userPaths.base);
            expect(res.status).toEqual(200);
            expect(res.body.data.users).toEqual([]);
        });
    });
});
