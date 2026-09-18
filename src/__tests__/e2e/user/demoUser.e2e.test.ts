import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';

import request from 'supertest';
import { ForbiddenError, UnauthorisedError } from 'shared/errors/errors';
import { expectResError, expectWrappedResponse } from '__tests__/e2e/helpers/e2eAssertions';
import { authPaths, playlistPaths, userPaths } from 'routes/path';
import { User } from 'features/user/types';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { extractCodeFromLastEmail, setAuthHeader } from '__tests__/e2e/helpers/e2eTestHelpers';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { seedCode, seedPlaylist, seedUser } from '__tests__/shared/seeds/seeds';
import { hashString } from 'shared/utils/hashing';

let user: User;
let accessToken: string;
const password = 'password';

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: Demo User', () => {
    beforeEach(async () => {
        const { app, db } = testEnv;
        jest.clearAllMocks();
        await truncateDbTables(db);
        await testEnv.redis.flushDb();

        user = await seedUser(db, { password, verified: true, isDemo: true });

        const loginRes = await request(app)
            .post(authPaths.login)
            .send({ email: user.email, password });
        expect(loginRes.status).toEqual(200);
        const code = extractCodeFromLastEmail(sendMailMock);
        const resCode = loginRes.body.data.demoCode;
        expect(resCode).toBe(code);
        const mfaRes = await request(app).post(authPaths.loginMfa).send({ code });
        expect(mfaRes.status).toEqual(200);
        ({ accessToken } = mfaRes.body.data);
    });
    test('Cannot update email', async () => {
        const { app } = testEnv;
        const res = await setAuthHeader({
            req: request(app).patch(userPaths.updateEmail),
            accessToken,
        }).send({ email: 'newemail@example.com' });
        expectResError({
            res,
            error: new ForbiddenError(
                'Demo accounts do not have permission to perform this action',
            ),
            mockLogger,
        });
    });
    test('Cannot delete account', async () => {
        const { app } = testEnv;
        const res = await setAuthHeader({
            req: request(app).delete(userPaths.me),
            accessToken,
        }).send();
        expectResError({
            res,
            error: new ForbiddenError(
                'Demo accounts do not have permission to perform this action',
            ),
            mockLogger,
        });
    });
    test('Cannot request password reset code', async () => {
        const { app } = testEnv;
        const res = await setAuthHeader({
            req: request(app).post(authPaths.resetPasswordReq),
            accessToken,
        }).send({ email: user.email });
        expectResError({
            res,
            error: new ForbiddenError('Cannot issue code'),
            mockLogger,
        });
    });
    test('Cannot request verification code', async () => {
        const { app } = testEnv;
        const res = await setAuthHeader({
            req: request(app).post(authPaths.verificationCodeReq),
            accessToken,
        }).send({ email: user.email });
        expectResError({
            res,
            error: new ForbiddenError('Cannot issue code'),
            mockLogger,
        });
    });
    test('Cannot reset password', async () => {
        const { app } = testEnv;
        const code = '123456';
        const codeHash = hashString(code);
        await seedCode(testEnv.redis, 'PASSWORD_RESET', { userId: user.id, codeHash });
        const res = await setAuthHeader({
            req: request(app).patch(authPaths.resetPassword),
            accessToken,
        }).send({ password: 'Aa1!xyz', code });
        expectResError({
            res,
            error: new UnauthorisedError('Could not verify password reset code'),
            mockLogger,
        });
    });
    test('Can update playlists', async () => {
        const playlist = await seedPlaylist(testEnv.db, { userId: user.id });
        const updatePlaylistRes = await setAuthHeader({
            req: request(testEnv.app).patch(playlistPaths.id(playlist.id)),
            accessToken,
        }).send({ name: 'Updated Playlist' });

        expect(updatePlaylistRes.status).toBe(200);
        expect(updatePlaylistRes.body.data.playlist).toEqual(
            expect.objectContaining({
                id: playlist.id,
                name: 'Updated Playlist',
            }),
        );
    });
    test('Can update username', async () => {
        const newUsername = 'newusername';
        const res = await setAuthHeader({
            req: request(testEnv.app).patch(userPaths.me),
            accessToken,
        }).send({ username: newUsername });

        expectWrappedResponse({
            res,
            data: { user: { id: user.id, username: newUsername } },
        });
        const dbUser = await testEnv.db.user.findUnique({ where: { id: user.id } });
        expect(dbUser!.username).toEqual(newUsername);
    });
});
