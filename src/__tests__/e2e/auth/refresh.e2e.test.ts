import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';
import request from 'supertest';
import { UnauthorisedError } from 'shared/errors/errors';
import {
    expectCookie,
    expectCookieCleared,
    expectResError,
    expectWrappedResponse,
} from '__tests__/e2e/helpers/e2eAssertions';
import { authPaths } from 'routes/path';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedRefreshToken, seedUser } from '__tests__/shared/seeds/seeds';
import { User } from 'features/user/types';
import { randomBytes } from 'crypto';
import { hashString } from 'shared/utils/hashing';
import { RefreshToken } from '@prisma/client';

import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: Auth Routes - Refresh Token Rotation', () => {
    let user: User;
    beforeEach(async () => {
        jest.clearAllMocks();
        await truncateDbTables(testEnv.db);
        await testEnv.redis.flushDb();
        user = await seedUser(testEnv.db, { verified: true });
    });
    test('should successfully rotate access and refesh tokens for verified user', async () => {
        const { app, db } = testEnv;
        const tokenString = randomBytes(64).toString('hex');
        const tokenHash = hashString(tokenString);
        await seedRefreshToken(db, { userId: user.id, tokenHash });

        const res = await request(app)
            .post(authPaths.refresh)
            .set('Cookie', [`refreshToken=${tokenString}`])
            .send();
        expectWrappedResponse({ res });

        expect(res.body.data.accessToken).toBeDefined();

        expectCookie({ name: 'refreshToken', res });

        const dbTokens: RefreshToken[] = await db.refreshToken.findMany({
            where: { userId: user.id },
        });
        expect(dbTokens.find((t) => !t.revokedAt)!).toBeDefined();
    });
    test('Should throw error (401 Unauthorised) if refresh token cookie is missing', async () => {
        const { app } = testEnv;
        const error = new UnauthorisedError('Unauthorized');
        const res = await request(app).post(authPaths.refresh).send();
        expect(res.status).toEqual(401);
        expectResError({ res, error, mockLogger });
    });

    test('Should throw error (401 Unauthorised) and clear cookies on refresh token re-use', async () => {
        const { app, db } = testEnv;
        const error = new UnauthorisedError('Invalid token');
        const tokenString = randomBytes(64).toString('hex');
        const tokenHash = hashString(tokenString);
        await seedRefreshToken(db, { userId: user.id, tokenHash, revokedAt: new Date() });

        const res = await request(app)
            .post(authPaths.refresh)
            .set('Cookie', [`refreshToken=${tokenString}`])
            .send();

        expect(res.status).toEqual(401);
        expectResError({ res, error, mockLogger });
        expectCookieCleared({ name: 'refreshToken', res });
    });

    test('Should throw error (401 Unauthorised) and clear cookies if refresh token is expired', async () => {
        const { app, db } = testEnv;
        const error = new UnauthorisedError('Invalid token');
        const tokenString = randomBytes(64).toString('hex');
        const tokenHash = hashString(tokenString);
        await seedRefreshToken(db, {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() - 1000),
        });

        const res = await request(app)
            .post(authPaths.refresh)
            .set('Cookie', [`refreshToken=${tokenString}`])
            .send();

        expect(res.status).toEqual(401);
        expectResError({ res, error, mockLogger });
        expectCookieCleared({ name: 'refreshToken', res });
    });
    test('Should throw error (401 Unauthorised) if user is not verified', async () => {
        const { app, db } = testEnv;
        await db.user.update({ where: { id: user.id }, data: { verified: false } });
        const error = new UnauthorisedError('Unauthorized');
        const res = await request(app).post(authPaths.refresh).send();
        expect(res.status).toEqual(401);
        expectResError({ res, error, mockLogger });
    });
});
