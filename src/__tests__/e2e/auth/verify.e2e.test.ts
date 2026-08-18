import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';
import { buildUserInput } from '__tests__/shared/factories';
import { CreateAccountInput } from 'features/auth/types';
import { authPaths } from 'routes/path';
import request from 'supertest';
import { expectCookie, expectResError } from '__tests__/e2e/helpers/e2eAssertions';
import { UnauthorisedError } from 'shared/errors/errors';
import { randomBytes } from 'crypto';
import { extractCodeFromLastEmail } from '__tests__/e2e/helpers/e2eTestHelpers';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import * as jwt from 'jsonwebtoken';

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: Auth - verify', () => {
    let userData: CreateAccountInput;
    beforeEach(async () => {
        await truncateDbTables(testEnv.db);
        await testEnv.redis.flushDb();
        jest.clearAllMocks();
        userData = buildUserInput();
        const registerRes = await request(testEnv.app).post(authPaths.register).send(userData);
        expect(registerRes.status).toEqual(201);
    });
    test('Should successfully verify user', async () => {
        const { app } = testEnv;
        const res = await request(app)
            .patch(authPaths.verify)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });
        const accessToken = res.body.data.accessToken;
        expect(res.body.data.accessToken).toBeDefined();
        const { id, deviceId } = jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET!,
        ) as jwt.JwtPayload;
        const refreshToken = await testEnv.db.refreshToken.findFirst({
            where: {
                userId: id,
                deviceId,
            },
        });
        expect(refreshToken).toBeDefined();
        expectCookie({ name: 'refreshToken', res });
        expectCookie({ name: 'deviceId', res });
    });
    test('Should throw error (401 Unauthorised) if user not found', async () => {
        const { app, db } = testEnv;
        const error = new UnauthorisedError('Invalid or expired verification code');
        await db.user.delete({ where: { email: userData.email } });
        const res = await request(app)
            .patch(authPaths.verify)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });
        expectResError({ res, error, mockLogger });
    });
    test('Should throw error (401 Unauthorised) if code not found', async () => {
        const { app } = testEnv;
        const error = new UnauthorisedError('Invalid or expired verification code');
        const res = await request(app)
            .patch(authPaths.verify)
            .send({ code: randomBytes(3).toString('hex') });
        expectResError({ res, error, mockLogger });
    });
});
