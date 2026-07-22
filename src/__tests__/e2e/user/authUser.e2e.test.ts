import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';

import request from 'supertest';
import { ForbiddenError, UnauthorisedError, ValidationError } from 'shared/errors/errors';
import { expectResError, expectWrappedResponse } from '__tests__/e2e/helpers/e2eAssertions';
import { authPaths, userPaths } from 'routes/path';
import { User } from 'features/user/types';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { extractCodeFromLastEmail, setAuthHeader } from '__tests__/e2e/helpers/e2eTestHelpers';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { seedUser } from '__tests__/shared/seeds/seeds';

let user: User;
let accessToken: string;
const password = 'password';
const ACCESS_TOKEN_SECRET: string = process.env.ACCESS_TOKEN_SECRET!;

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: User Routes - authenticated user (/me)', () => {
    beforeEach(async () => {
        const { app, db } = testEnv;
        jest.clearAllMocks();
        await truncateDbTables(db);
        await testEnv.redis.flushDb();

        user = await seedUser(db, { password, verified: false });

        const loginRes = await request(app)
            .post(authPaths.login)
            .send({ email: user.email, password });
        expect(loginRes.status).toEqual(200);
        const code = extractCodeFromLastEmail(sendMailMock);
        const mfaRes = await request(app).post(authPaths.loginMfa).send({ code });
        expect(mfaRes.status).toEqual(200);
        ({ accessToken } = mfaRes.body.data);
    });
    describe('Get authenticate user', () => {
        test('should get details of auth user in access token', async () => {
            const { app } = testEnv;
            const res = await setAuthHeader({
                req: request(app).get(userPaths.me),
                accessToken,
            }).send();
            expectWrappedResponse({
                res,
                data: { user: { email: user.email, id: user.id, username: user.username } },
            });
        });
        test('Should throw error (401 Unauthorized) if not logged in', async () => {
            const { app } = testEnv;

            const res = await request(app).get(userPaths.me).send();

            expectResError({ res, error: new UnauthorisedError('Unauthorized'), mockLogger });
        });
    });
    describe('Delete authenticate user', () => {
        test('should delete logged in user', async () => {
            const { app, db } = testEnv;
            await db.user.update({ where: { id: user.id }, data: { verified: true } });
            const res = await setAuthHeader({
                req: request(app).delete(userPaths.me),
                accessToken,
            }).send();
            expect(res.status).toEqual(204);
            expect(await db.user.findMany()).toHaveLength(0);
        });
        test('should throw error (401 Unauthorized) if not logged in', async () => {
            const { app } = testEnv;

            const res = await request(app).delete(userPaths.me).send();

            expectResError({ res, error: new UnauthorisedError('Unauthorized'), mockLogger });
        });
        test('should throw error (403 Forbidden) if not verified in', async () => {
            const { app } = testEnv;
            const res = await setAuthHeader({
                req: request(app).delete(userPaths.me),
                accessToken,
            }).send();

            expectResError({ res, error: new ForbiddenError('Email not verified'), mockLogger });
        });
    });

    describe('Update authenticate user', () => {
        const newUsername = 'newusername';

        test('should update details of logged in user', async () => {
            const { app, db } = testEnv;
            await db.user.update({ where: { id: user.id }, data: { verified: true } });
            const res = await setAuthHeader({
                req: request(app).patch(userPaths.me),
                accessToken,
            }).send({ username: newUsername });

            expectWrappedResponse({
                res,
                data: { user: { id: user.id, username: newUsername } },
            });
            const dbUser = await db.user.findUnique({ where: { id: user.id } });
            expect(dbUser!.username).toEqual(newUsername);
        });
        test('should ignore disallowed update fields', async () => {
            const { app, db } = testEnv;
            await db.user.update({ where: { id: user.id }, data: { verified: true } });
            const res = await setAuthHeader({
                req: request(app).patch(userPaths.me),
                accessToken,
            }).send({ username: newUsername, email: 'differentemail.com.au' });

            expectWrappedResponse({
                res,
                data: { user: { id: user.id, username: newUsername } },
            });
            const dbUser = await db.user.findUnique({ where: { id: user.id } });
            expect(dbUser!.username).toEqual(newUsername);
            expect(dbUser!.email).toEqual(user.email);
        });
        test('should throw error (400 Bad Input) if user tries to update only dissallowed fields', async () => {
            const { app, db } = testEnv;
            await db.user.update({ where: { id: user.id }, data: { verified: true } });
            const res = await setAuthHeader({
                req: request(app).patch(userPaths.me),
                accessToken,
            }).send({ password: 'newPassword' });
            expectResError({ res, error: new ValidationError('Invalid Input'), mockLogger });
        });
        test('should throw error (400 Bad Input) if user does not provide fields for update', async () => {
            const { app, db } = testEnv;
            await db.user.update({ where: { id: user.id }, data: { verified: true } });
            const res = await setAuthHeader({
                req: request(app).patch(userPaths.me),
                accessToken,
            }).send();
            expectResError({ res, error: new ValidationError('Invalid Input'), mockLogger });
        });
        test('should throw error (401 Unauthorized) if access token expired', async () => {
            const { app, db } = testEnv;
            await db.user.update({ where: { id: user.id }, data: { verified: true } });
            const badToken = jwt.sign(
                { id: user.id, deviceId: randomBytes(32).toString('hex') },
                ACCESS_TOKEN_SECRET,
                {
                    expiresIn: -1,
                },
            );
            const res = await setAuthHeader({
                req: request(app).patch(userPaths.me),
                accessToken: badToken,
            }).send();
            expectResError({ res, error: new UnauthorisedError('Unauthorized'), mockLogger });
        });
        test('should throw error (401 Unauthorized) if not logged in', async () => {
            const { app, db } = testEnv;
            await db.user.update({ where: { id: user.id }, data: { verified: true } });
            const res = await request(app).patch(userPaths.me).send({ username: newUsername });

            expectResError({ res, error: new UnauthorisedError('Unauthorized'), mockLogger });
        });
        test('should throw error (403 Forbidden) if not verified', async () => {
            const { app } = testEnv;
            const res = await setAuthHeader({
                req: request(app).patch(userPaths.me),
                accessToken,
            }).send({ username: newUsername });

            expectResError({ res, error: new ForbiddenError('Email not verified'), mockLogger });
        });
    });
});
