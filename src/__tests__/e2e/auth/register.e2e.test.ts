import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import request from 'supertest';
import { buildUserInput } from '__tests__/shared/factories';
import { ConflictError, ValidationError } from 'shared/errors/errors';
import { expectResError, expectWrappedResponse } from '__tests__/e2e/helpers/e2eAssertions';
import { authPaths } from 'routes/path';
import { CreateAccountInput } from 'features/auth/types';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';

import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
let userInputData: CreateAccountInput;

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});
afterAll(async () => {
    await testEnv.teardown();
});

afterEach(async () => {
    await testEnv.redis.flushDb();
});

describe('e2e tests: Auth Routes - Register', () => {
    beforeEach(async () => {
        await truncateDbTables(testEnv.db);
        jest.clearAllMocks();
        userInputData = buildUserInput();
    });
    test('should register a new user', async () => {
        const { app, db } = testEnv;
        const res = await request(app).post(authPaths.register).send(userInputData);
        expectWrappedResponse({ res, status: 201 });

        const dbUser = await db.user.findUnique({ where: { email: userInputData.email } });
        expect(dbUser).toBeDefined();
        expect(dbUser!.verified).toBe(false);
    });

    test('should throw error (409 Conflict) if registering with an existing email', async () => {
        const { app } = testEnv;
        await request(app).post(authPaths.register).send(userInputData);
        const user2InputData = buildUserInput({ email: userInputData.email });
        const res = await request(app).post(authPaths.register).send(user2InputData);
        const error = new ConflictError('Email already in use');
        expectResError({ res, error, mockLogger });
    });

    test('should throw error (409 Conflict) if registering with an existing username', async () => {
        const { app } = testEnv;
        await request(app).post(authPaths.register).send(userInputData);
        const user2InputData = buildUserInput({ username: userInputData.username });
        const res = await request(app).post(authPaths.register).send(user2InputData);
        const error = new ConflictError('Username already in use');
        expectResError({ res, error, mockLogger });
    });

    test('should throw error (400 Bad Request) if password is missing', async () => {
        const { app } = testEnv;
        const { email, username } = userInputData;
        const res = await request(app).post(authPaths.register).send({ email, username });
        const error = new ValidationError('Invalid Input');
        expectResError({ res, error, mockLogger });
    });

    test('Should throw error (400 Bad Request) if fields have invalid type', async () => {
        const { app } = testEnv;
        (userInputData as any).username = 2;
        const res = await request(app).post(authPaths.register).send(userInputData);
        const error = new ValidationError('Invalid Input');
        expectResError({ res, error, mockLogger });
    });
});
