import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';
import { buildUserInput } from '__tests__/shared/factories';
import { CreateAccountInput } from 'features/auth/types';
import { authPaths } from 'routes/path';
import request from 'supertest';
import { expectResError, expectWrappedResponse } from '__tests__/e2e/helpers/e2eAssertions';
import { UnauthorisedError } from 'shared/errors/errors';
import { hashString } from 'shared/utils/hashing';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { extractCodeFromLastEmail } from '__tests__/e2e/helpers/e2eTestHelpers';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('e2e tests: Auth - verify', () => {
    beforeEach(async () => {
        await truncateDbTables(testEnv.db);
        await testEnv.redis.flushDb();
        jest.clearAllMocks();
    });
    let userData: CreateAccountInput;
    beforeEach(async () => {
        userData = buildUserInput();
        const registerRes = await request(testEnv.app).post(authPaths.register).send(userData);
        expect(registerRes.status).toEqual(201);
    });
    test('Should issue a new verification code', async () => {
        const { app } = testEnv;
        const oldCode = extractCodeFromLastEmail(sendMailMock);
        const codeReqRes = await request(app)
            .post(authPaths.verificationCodeReq)
            .send({ email: userData.email });
        expectWrappedResponse({
            res: codeReqRes,
            message: 'If email is valid you will receive a code',
        });
        expect(extractCodeFromLastEmail(sendMailMock)).not.toEqual(oldCode);

        const failedVerifyRes = await request(app).patch(authPaths.verify).send({ code: oldCode });
        expectResError({
            res: failedVerifyRes,
            error: new UnauthorisedError('Invalid or expired verification code'),
            mockLogger,
        });

        const successfulVerify = await request(app)
            .patch(authPaths.verify)
            .send({
                code: extractCodeFromLastEmail(sendMailMock),
            });
        expectWrappedResponse({
            res: successfulVerify,
        });
        expect(sendMailMock).toHaveBeenCalledTimes(2);
    });
    test('Should return if user not found with no code sent', async () => {
        const { app, db } = testEnv;
        await db.user.delete({ where: { email: userData.email } });
        const codeReqRes = await request(app)
            .post(authPaths.verificationCodeReq)
            .send({ email: userData.email });
        expectWrappedResponse({
            res: codeReqRes,
            message: 'If email is valid you will receive a code',
        });

        const failedVerifyRes = await request(app)
            .patch(authPaths.verify)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });
        expectResError({
            res: failedVerifyRes,
            error: new UnauthorisedError('Invalid or expired verification code'),
            mockLogger,
        });
        expect(sendMailMock).toHaveBeenCalledTimes(1);
    });
    test('Should return if user already verified with no code sent', async () => {
        const { app } = testEnv;
        await request(app)
            .patch(authPaths.verify)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });
        const codeReqRes = await request(app)
            .post(authPaths.verificationCodeReq)
            .send({ email: userData.email });
        expectWrappedResponse({
            res: codeReqRes,
            message: 'If email is valid you will receive a code',
        });

        const failedVerifyRes = await request(app)
            .patch(authPaths.verify)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });
        expectResError({
            res: failedVerifyRes,
            error: new UnauthorisedError('Invalid or expired verification code'),
            mockLogger,
        });
        expect(sendMailMock).toHaveBeenCalledTimes(1);
    });
    test('Should log if email sending fails and save code in cache', async () => {
        const { app, db, redis } = testEnv;
        const code = extractCodeFromLastEmail(sendMailMock);
        sendMailMock.mockRejectedValueOnce(new Error('Email service failure'));
        const codeReqRes = await request(app)
            .post(authPaths.verificationCodeReq)
            .send({ email: userData.email });
        expectWrappedResponse({
            res: codeReqRes,
            message: 'If email is valid you will receive a code',
        });
        const user = await db.user.findUnique({ where: { email: userData.email } });
        const storedCode = await redis.get(`user-code:${user!.id}:${'VERIFICATION'}`);
        const codeData = JSON.parse(storedCode!);
        expect(codeData).not.toBeNull();
        expect(codeData!.codeHash).not.toEqual(hashString(code));
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
});
