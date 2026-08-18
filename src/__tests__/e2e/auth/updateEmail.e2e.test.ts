import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';
import request from 'supertest';
import { buildUserInput } from '__tests__/shared/factories';
import { ConflictError, UnauthorisedError, NotFoundError } from 'shared/errors/errors';
import { expectResError, expectWrappedResponse } from '__tests__/e2e/helpers/e2eAssertions';
import { authPaths, userPaths } from 'routes/path';
import { CreateAccountInput } from 'features/auth/types';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { extractCodeFromLastEmail } from '__tests__/e2e/helpers/e2eTestHelpers';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { seedUser } from '__tests__/shared/seeds/seeds';
import { User } from 'features/user/types';
let userInputData: CreateAccountInput;

let testEnv: TestAppEnv;
let user: User;

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

        user = await seedUser(db, { verified: true, ...userInputData });
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

    test('should throw error (404 Not Found) if user is not verified', async () => {
        const { app, db } = testEnv;
        await db.user.update({ where: { id: user.id }, data: { verified: false } });
        const res = await request(app)
            .patch(userPaths.updateEmail)
            .set('Authorization', `Bearer ${token}`)
            .send({ email: 'newemail@example.com' });

        const error = new NotFoundError('User not found');
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
});
