import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { authPaths, userPaths } from 'routes/path';
import request from 'supertest';

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterEach(async () => {
    await testEnv.redis.flushDb();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('Rate Limiting', () => {
    const limiters = [
        { reqPath: () => request(testEnv.app).post(authPaths.login), limit: 21 },
        { reqPath: () => request(testEnv.app).get(userPaths.base), limit: 101, method: 'get' },
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
