import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';
import request from 'supertest';
import { buildUserInput } from '__tests__/shared/factories';
import { ConflictError, UnauthorisedError, ForbiddenError } from 'shared/errors/errors';
import { expectResError, expectWrappedResponse } from '__tests__/e2e/helpers/e2eAssertions';
import { authPaths, userPaths } from 'routes/path';
import { CreateAccountInput } from 'features/auth/types';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { extractCodeFromLastEmail } from '__tests__/e2e/helpers/e2eTestHelpers';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
let userInputData: CreateAccountInput;

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: Auth Routes - Update email', () => {
    let token: string;
    beforeEach(async () => {
        const { app, db } = testEnv;
        jest.clearAllMocks();
        await truncateDbTables(db);
        await testEnv.redis.flushDb();
        userInputData = buildUserInput();

        const regiserRes = await request(app).post(authPaths.register).send(userInputData);
        expect(regiserRes.status).toEqual(201);
        await request(app)
            .post(authPaths.login)
            .send({ email: userInputData.email, password: userInputData.password });
        const res = await request(app)
            .post(authPaths.loginMfa)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });
        expect(res.status).toEqual(200);

        token = res.body.data.accessToken;
    });

    test('Should update a users email', async () => {
        const { app, db } = testEnv;
        await db.user.update({
            where: { email: userInputData.email },
            data: { verified: true },
        });

        const newEmail = 'newemail@example.com';

        const res = await request(app)
            .patch(userPaths.updateEmail)
            .set('Authorization', `Bearer ${token}`)
            .send({ email: newEmail });

        expectWrappedResponse({ res, status: 200 });
        const updatedUser = await db.user.findUnique({
            where: { email: newEmail },
        });

        expect(updatedUser!.email).toBe(newEmail);
    });

    test('should throw error (409 Conflict) if updating with an existing email', async () => {
        const { app, db } = testEnv;
        const existingUser = buildUserInput();
        await request(app).post(authPaths.register).send(existingUser);

        await db.user.update({
            where: { email: userInputData.email },
            data: { verified: true },
        });

        const res = await request(app)
            .patch(userPaths.updateEmail)
            .set('Authorization', `Bearer ${token}`)
            .send({ email: existingUser.email });

        const error = new ConflictError('Email already in use');
        expectResError({ res, error, mockLogger });
    });

    test('should throw error (403 Forbidden) if user is not verified', async () => {
        const { app } = testEnv;
        const res = await request(app)
            .patch(userPaths.updateEmail)
            .set('Authorization', `Bearer ${token}`)
            .send({ email: 'newemail@example.com' });

        const error = new ForbiddenError('Email not verified');
        expectResError({ res, error, mockLogger });
    });

    test('should throw error (401 Unauthorised) if no token provided', async () => {
        const { app } = testEnv;
        const res = await request(app)
            .patch(userPaths.updateEmail)
            .send({ email: 'newemail@example.com' });

        const error = new UnauthorisedError('Unauthorized');
        expectResError({ res, error, mockLogger });
    });
    test('should leave user unverified after email update', async () => {
        const { app, db } = testEnv;
        await db.user.update({
            where: { email: userInputData.email },
            data: { verified: true },
        });

        const newEmail = 'newemail@example.com';

        const res = await request(app)
            .patch(userPaths.updateEmail)
            .set('Authorization', `Bearer ${token}`)
            .send({ email: newEmail });

        expectWrappedResponse({ res, status: 200 });

        const res2 = await request(app)
            .patch(userPaths.me)
            .set('Authorization', `Bearer ${token}`)
            .send({ username: 'newusername' });

        expectResError({ res: res2, error: new ForbiddenError('Email not verified'), mockLogger });
    });
});
