jest.mock('shared/logger/logger');
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { seedUser } from '__tests__/shared/seeds/seeds';
import { authPaths, playlistPaths, userPaths } from 'routes/path';
import request from 'supertest';
jest.unmock('middleware/rateLimitMiddleware');
import * as jwt from 'jsonwebtoken';
import { setAuthHeader } from '__tests__/e2e/helpers/e2eTestHelpers';

let testEnv: TestAppEnv;
let accessToken: string;

beforeAll(async () => {
    testEnv = await createTestApp();
    const user = await seedUser(testEnv.db, {
        verified: true,
    });
    accessToken = jwt.sign(
        {
            id: user.id,
            deviceId: 'test-device',
        },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN!) },
    );
});

beforeEach(async () => {
    await testEnv.redis.flushDb();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('Rate Limiting', () => {
    const limiters = [
        { reqPath: () => request(testEnv.app).post(authPaths.login), limit: 21 },
        { reqPath: () => request(testEnv.app).get(userPaths.me), limit: 301, method: 'get' },
        {
            reqPath: () =>
                setAuthHeader({
                    req: request(testEnv.app).get(playlistPaths.base),
                    accessToken,
                }),
            limit: 301,
        },
    ];
    test.each(limiters)('blocks requests after limit is reached', async (limiter) => {
        const { reqPath, limit } = limiter;
        let lastResponse;
        for (let i = 0; i < limit + 1; i++) {
            lastResponse = await reqPath();
            if (i < limit - 1) {
                expect(lastResponse.status).not.toBe(429);
            }
        }

        expect(lastResponse!.status).toBe(429);

        expect(lastResponse!.text).toContain('Too many requests');
    });
});
