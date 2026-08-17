import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';
import { buildUserInput } from '__tests__/shared/factories';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import {
    extractCodeFromLastEmail,
    extractCookie,
    setAuthHeader,
} from '__tests__/e2e/helpers/e2eTestHelpers';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { authPaths, userPaths } from 'routes/path';
import request from 'supertest';

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

beforeEach(async () => {
    jest.clearAllMocks();
    await truncateDbTables(testEnv.db);
    await testEnv.redis.flushDb();
});

describe('E2E Auth Full Flows', () => {
    test('Token lifecycle: register → /me → rotate → logout', async () => {
        const userData = buildUserInput();
        //register
        const registerRes = await request(testEnv.app).post(authPaths.register).send(userData);
        expect(registerRes.status).toBe(201);

        //verify
        const verifyRes = await request(testEnv.app)
            .patch(authPaths.verify)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });
        expect(verifyRes.status).toBe(200);

        const loginRes = await request(testEnv.app).post(authPaths.login).send(userData);
        expect(loginRes.status).toBe(200);

        const loginMfaRes = await request(testEnv.app)
            .post(authPaths.loginMfa)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });
        expect(loginMfaRes.status).toBe(200);
        const { accessToken } = loginMfaRes.body.data;
        const refreshToken = extractCookie({ res: loginMfaRes, name: 'refreshToken' });
        const cookieValue = refreshToken?.split(';')[0];

        // protected route
        const protectedRes = await setAuthHeader({
            req: request(testEnv.app).get(userPaths.me),
            accessToken,
        }).send();
        expect(protectedRes.status).toEqual(200);

        // refresh tokens
        const refreshRes = await request(testEnv.app)
            .post(authPaths.refresh)
            .set('Cookie', [cookieValue])
            .send();
        expect(refreshRes.status).toEqual(200);

        // token reuse
        const reusetoken = await request(testEnv.app)
            .post(authPaths.refresh)
            .set('Cookie', [cookieValue])
            .send();
        expect(reusetoken.status).toEqual(401);

        const newAccessToken = refreshRes.body.data.accessToken;

        // protected route
        const protectedRes2 = await setAuthHeader({
            req: request(testEnv.app).get(userPaths.me),
            accessToken: newAccessToken,
        }).send();
        expect(protectedRes2.status).toEqual(200);

        //logout
        const logoutRes = await setAuthHeader({
            req: request(testEnv.app).post(authPaths.logout),
            accessToken: newAccessToken,
        }).send();

        expect(logoutRes.status).toEqual(200);
        const loggedOutRefreshToken = extractCookie({ res: logoutRes, name: 'refreshToken' });
        expect(loggedOutRefreshToken).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
    });

    test('Password reset full flow', async () => {
        const newPassword = 'newPassword123!&';
        const userData = buildUserInput();
        //register
        const registerRes = await request(testEnv.app).post(authPaths.register).send(userData);

        expect(registerRes.status).toBe(201);

        //verify user
        await request(testEnv.app)
            .patch(authPaths.verify)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });

        // request code
        const codeRes = await request(testEnv.app).post(authPaths.resetPasswordReq).send({
            email: userData.email,
        });
        expect(codeRes.status).toEqual(200);

        //reset password
        const resetRes = await request(testEnv.app)
            .patch(authPaths.resetPassword)
            .send({ code: extractCodeFromLastEmail(sendMailMock), password: newPassword });
        expect(resetRes.status).toEqual(200);
        // cannot login with old password
        const badLoginRes = await request(testEnv.app)
            .post(authPaths.login)
            .send({ email: userData.email, password: userData.password });

        expect(badLoginRes.status).toEqual(401);

        // login with new password
        const goodLoginRes = await request(testEnv.app)
            .post(authPaths.login)
            .send({ email: userData.email, password: newPassword });

        expect(goodLoginRes.status).toEqual(200);
    });
});
