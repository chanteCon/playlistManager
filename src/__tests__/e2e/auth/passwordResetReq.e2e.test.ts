import request from 'supertest';
import { authPaths } from 'routes/path';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedUser } from '__tests__/shared/seeds/seeds';
import { expectWrappedResponse } from '__tests__/e2e/helpers/e2eAssertions';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: Auth Routes - Request Password Reset', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await truncateDbTables(testEnv.db);
        await testEnv.redis.flushDb();
    });

    test('should successfully return password reset code and status 200', async () => {
        const { app, db, redis } = testEnv;
        const user = await seedUser(db);
        const res = await request(app).post(authPaths.resetPasswordReq).send({ email: user.email });
        expectWrappedResponse({ res });
        const cachedCode = await redis.get(`user-code:${user.id}:PASSWORD_RESET`);
        expect(cachedCode).toBeDefined();
    });

    test('Should return null if email does not exist', async () => {
        const { app } = testEnv;
        const res = await request(app)
            .post(authPaths.resetPasswordReq)
            .send({ email: 'fakeemail@email.com' });
        expectWrappedResponse({
            res,
            message: 'If email is valid you will receive a code',
        });
    });
});
