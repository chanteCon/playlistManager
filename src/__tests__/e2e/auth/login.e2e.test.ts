import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { UnauthorisedError } from 'shared/errors/errors';
import {
    expectCookie,
    expectResError,
    expectWrappedResponse,
} from '__tests__/e2e/helpers/e2eAssertions';
import { authPaths } from 'routes/path';
import { seedUser } from '__tests__/shared/seeds/seeds';
import { User } from 'features/user/types';
import { buildUser } from '__tests__/shared/factories';
import { hashString } from 'shared/utils/hashing';

import { extractCodeFromLastEmail } from '__tests__/e2e/helpers/e2eTestHelpers';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
let password: string;

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: Auth Routes - Login', () => {
    let user: User;
    beforeEach(async () => {
        await testEnv.redis.flushDb();
        await truncateDbTables(testEnv.db);
        jest.clearAllMocks();
        ({ password } = buildUser());
        user = await seedUser(testEnv.db, { password });
    });
    test('should successfully login user and return access token', async () => {
        const { app, db } = testEnv;
        const loginRes = await request(app)
            .post(authPaths.login)
            .send({ email: user.email, password });

        expectWrappedResponse({
            res: loginRes,
            message: 'If email is valid you will receive a login code',
        });
        const code = extractCodeFromLastEmail(sendMailMock);
        const loginMfaRes = await request(app).post(authPaths.loginMfa).send({ code });
        expectWrappedResponse({ res: loginMfaRes });
        const accessToken = loginMfaRes.body.data.accessToken;
        expect(loginMfaRes.body.data.accessToken).toBeDefined();
        const { id, deviceId } = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as jwt.JwtPayload;

        const refreshToken = await db.refreshToken.findFirst({
            where: {
                userId: id,
                deviceId,
            },
        });
        expect(refreshToken).toBeDefined();
        expectCookie({ name: 'refreshToken', res: loginMfaRes });
        expectCookie({ name: 'deviceId', res: loginMfaRes });
    });

    test('Should throw error (401 Unauthorised) if password is incorrect', async () => {
        const { app } = testEnv;
        const res = await request(app)
            .post(authPaths.login)
            .send({ email: user.email, password: 'incorrect password' });
        const error = new UnauthorisedError('Incorrect email or password');
        expectResError({ res, error, mockLogger });
        expect(res.headers['set-cookie']).toBeUndefined();
    });

    test('Should throw error (401 Unauthorised)if user does not exist', async () => {
        const { app } = testEnv;
        const res = await request(app)
            .post(authPaths.login)
            .send({ email: 'nonexistent@email.com', password });
        const error = new UnauthorisedError('Incorrect email or password');
        expectResError({ res, error, mockLogger });
        expect(res.headers['set-cookie']).toBeUndefined();
    });
    test('Should throw error (401 Unauthorised) if code is expired', async () => {
        const { app, redis } = testEnv;
        const loginRes = await request(app)
            .post(authPaths.login)
            .send({ email: user.email, password });
        expectWrappedResponse({
            res: loginRes,
            message: 'If email is valid you will receive a login code',
        });
        const code = extractCodeFromLastEmail(sendMailMock);
        await redis.expire(`user-code:${hashString(code)}`, 0);

        const loginMfaRes = await request(app).post(authPaths.loginMfa).send({ code });

        expectResError({
            res: loginMfaRes,
            error: new UnauthorisedError('Invalid or expired login code'),
            mockLogger,
        });
    });
    test('Should throw error (401 unauthorised) if code not found', async () => {
        const { app, redis } = testEnv;
        const loginRes = await request(app)
            .post(authPaths.login)
            .send({ email: user.email, password });
        expectWrappedResponse({
            res: loginRes,
            message: 'If email is valid you will receive a login code',
        });
        const code = extractCodeFromLastEmail(sendMailMock);
        await redis.del(`user-code:${hashString(code)}`);
        const loginMfaRes = await request(app).post(authPaths.loginMfa).send({ code });

        expectResError({
            res: loginMfaRes,
            error: new UnauthorisedError('Invalid or expired login code'),
            mockLogger,
        });
    });
});
