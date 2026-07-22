import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import request from 'supertest';
import { authPaths } from 'routes/path';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedCode, seedUser } from '__tests__/shared/seeds/seeds';
import { seedRefreshToken } from '__tests__/shared/seeds/seeds';
import { randomBytes } from 'crypto';
import { expectResError, expectWrappedResponse } from '__tests__/e2e/helpers/e2eAssertions';
import { ForbiddenError, UnauthorisedError } from 'shared/errors/errors';
import { hashString } from 'shared/utils/hashing';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: Auth Routes - Reset Password', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await truncateDbTables(testEnv.db);
        await testEnv.redis.flushDb();
    });
    test('should successfully reset password and clear refresh token cookie ', async () => {
        const { app, db, redis } = testEnv;
        const user = await seedUser(db);
        await seedRefreshToken(db, { userId: user.id });
        const codeStr = randomBytes(3).toString('hex');
        await seedCode(testEnv.redis, 'PASSWORD_RESET', {
            userId: user.id,
            codeHash: hashString(codeStr),
        });
        const newPassword = 'newPassword123$$!';
        const res = await request(app)
            .patch(authPaths.resetPassword)
            .send({ code: codeStr, password: newPassword });
        expectWrappedResponse({ res, message: 'Password successfully reset' });
        const cachedCode = await redis.get(`user-code:${user.id}:PASSWORD_RESET`);
        expect(cachedCode).toBeNull();
        const dbToken = await db.refreshToken.findFirst({ where: { userId: user.id } });
        expect(dbToken!.revokedAt).toBeInstanceOf(Date);
        const loginRes = await request(app)
            .post(authPaths.login)
            .send({ email: user.email, password: newPassword });
        expect(loginRes.status).toEqual(200);
    });
    test('Should throw error (401 Unauthorised) if the rest code is expired', async () => {
        const { app, db, redis } = testEnv;
        const user = await seedUser(db);
        await seedRefreshToken(db, { userId: user.id });
        const codeStr = randomBytes(3).toString('hex');
        const codeHash = hashString(codeStr);
        await seedCode(testEnv.redis, 'PASSWORD_RESET', {
            userId: user.id,
            codeHash,
        });
        await redis.expire(`user-code:${codeHash}`, 0);
        const res = await request(app)
            .patch(authPaths.resetPassword)
            .send({ code: codeStr, password: 'newPassword123$!' });
        expectResError({
            res,
            error: new UnauthorisedError('Invalid or expired password reset code'),
            mockLogger,
        });
        const dbToken = await db.refreshToken.findFirst({ where: { userId: user.id } });
        expect(dbToken!.revokedAt).toBeNull();
    });
    test('Should throw error (403 Forbidden) if user not found', async () => {
        const { app, db, redis } = testEnv;
        const user = await seedUser(db);
        const codeStr = randomBytes(3).toString('hex');
        const codeHash = hashString(codeStr);
        await seedCode(testEnv.redis, 'PASSWORD_RESET', {
            codeHash,
            userId: user.id,
        });
        await db.user.delete({ where: { id: user.id } });
        const res = await request(app)
            .patch(authPaths.resetPassword)
            .send({ code: codeStr, password: 'newPassword123$!' });
        expectResError({
            res,
            error: new ForbiddenError('Invalid or expired password reset code'),
            mockLogger,
        });
        const cachedCode = await redis.get(`user-code:${user.id}:${'PASSWORD_RESET'}`);
        expect(cachedCode).toBeNull();
    });
});
