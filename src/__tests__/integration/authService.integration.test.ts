import { mockEmailService } from '__tests__/shared/mocks/services';

import { CreateAccountInput } from 'features/auth/types';
import { RefreshToken } from '@prisma/client';
import { buildCodeInput, buildUserInput } from '__tests__/shared/factories';

import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedCode, seedUser } from '__tests__/shared/seeds/seeds';
import { seedRefreshToken } from '__tests__/shared/seeds/seeds';
import { User } from 'features/user/types';
import { UnauthorisedError } from 'shared/errors/errors';
import { hashString } from 'shared/utils/hashing';
import { createAuthServiceFixture } from '__tests__/setup/integration';
import { AuthService } from 'features/auth/services/authService';
import { CodeService } from 'shared/userCodes/codeService';
import { createTestInfrastructure, InfraStructure } from '__tests__/setup/infrastructure';

const ACCESS_TOKEN_SECRET: string = process.env.ACCESS_TOKEN_SECRET!;

let testEnv: InfraStructure & { authService: AuthService; codeService: CodeService };
const emailService = mockEmailService;

beforeAll(async () => {
    const infra = await createTestInfrastructure();
    const auth = createAuthServiceFixture({
        ...infra,
        emailService: mockEmailService,
    });
    testEnv = { ...infra, ...auth };
});
afterAll(async () => {
    await testEnv.teardown();
});

const getUserIdFromToken = (accessToken: string) => {
    const payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as jwt.JwtPayload;
    return payload.id;
};

describe('Integration tests: Auth service', () => {
    let userInputData: CreateAccountInput;

    beforeEach(async () => {
        userInputData = buildUserInput();
        jest.clearAllMocks();
        await truncateDbTables(testEnv.db);
        await testEnv.redis.flushDb();
    });

    describe('Register', () => {
        test('Successfully adds unverified user and verification code to database', async () => {
            await testEnv.authService.register(userInputData);

            const dbUser = await testEnv.db.user.findUnique({
                where: { email: userInputData.email },
            });
            expect(dbUser).not.toBeNull();
            expect(dbUser!.verified).toEqual(false);
            const cachedCode = await testEnv.redis.get(`user-code:${dbUser!.id}:VERIFICATION`);
            expect(cachedCode).not.toBeNull();
            expect(emailService.sendCodeEmail).toHaveBeenCalledTimes(1);
        });
        test('Throws if email already taken', async () => {
            await testEnv.authService.register(userInputData);
            const user2InputData = buildUserInput({ email: userInputData.email });
            await expect(testEnv.authService.register(user2InputData)).rejects.toThrow(
                'Email already in use',
            );

            const users = await testEnv.db.user.findMany();
            expect(users).toHaveLength(1);
            expect(users[0].verified).toEqual(false);
            expect(emailService.sendCodeEmail).toHaveBeenCalledTimes(1);
        });
        test('Throws if username already taken', async () => {
            await testEnv.authService.register(userInputData);
            const user2InputData = buildUserInput({ username: userInputData.username });
            await expect(testEnv.authService.register(user2InputData)).rejects.toThrow(
                'Username already in use',
            );

            const users = await testEnv.db.user.findMany();
            expect(users).toHaveLength(1);
            expect(users[0].verified).toEqual(false);
            expect(emailService.sendCodeEmail).toHaveBeenCalledTimes(1);
        });
    });
    describe('Start login', () => {
        test('Should successfully verify credentials and email login code to user', async () => {
            await testEnv.authService.register(userInputData);
            await testEnv.authService.startLogin({
                email: userInputData.email,
                password: userInputData.password,
            });
            expect(emailService.sendCodeEmail).toHaveBeenCalledTimes(2);
            const dbUser = await testEnv.db.user.findUnique({
                where: { email: userInputData.email },
            });
            const cachedCode = await testEnv.redis.get(`user-code:${dbUser!.id}:LOGIN`);
            expect(JSON.parse(cachedCode!).codeType).not.toBeNull();
        });
        test('Should throw if user not found', async () => {
            await expect(
                testEnv.authService.startLogin({
                    email: userInputData.email,
                    password: userInputData.password,
                }),
            ).rejects.toThrow('Incorrect email or password');
            expect(emailService.sendCodeEmail).toHaveBeenCalledTimes(0);
        });
        test('Should throw if password incorrect', async () => {
            await testEnv.authService.register(userInputData);
            await expect(
                testEnv.authService.startLogin({
                    email: userInputData.email,
                    password: 'incorrectPassword',
                }),
            ).rejects.toThrow('Incorrect email or password');
            expect(emailService.sendCodeEmail).toHaveBeenCalledTimes(1);
            const dbUser = await testEnv.db.user.findUnique({
                where: { email: userInputData.email },
            });
            const cachedCode = await testEnv.redis.get(`user-code:${dbUser!.id}:LOGIN`);
            expect(cachedCode).toBeNull();
        });
    });
    describe('Login MFA', () => {
        const codePlainStr = 'loginCode';
        const codeHash = hashString(codePlainStr);
        let user: User;

        beforeEach(async () => {
            user = await seedUser(testEnv.db, userInputData);
            await seedCode(testEnv.redis, 'LOGIN', { userId: user.id, codeHash });
        });
        test('Should add refresh token to testEnv.db and remove code from testEnv.db for user with valid code', async () => {
            const { refreshToken } = await testEnv.authService.loginMfa({
                code: codePlainStr,
            });
            const tokenHash = hashString(refreshToken);
            const dbToken = await testEnv.db.refreshToken.findUnique({
                where: { tokenHash },
            });
            expect(dbToken!.userId).toEqual(user.id);
            const cachedCode = await testEnv.redis.get(`user-code:${codeHash}`);
            expect(cachedCode).toBeNull();
        });
        test('Should revoke tokens in testEnv.db if existing id provided', async () => {
            const existingDeviceId = 'existingDeviceId';
            const oldToken = 'oldtoken';
            const testTokenHash = hashString(oldToken);
            await seedRefreshToken(testEnv.db, {
                deviceId: existingDeviceId,
                userId: user.id,
            });
            const { refreshToken } = await testEnv.authService.loginMfa({
                code: codePlainStr,
                existingDeviceId,
            });
            const tokenHash = hashString(refreshToken);
            const oldTokenDB = await testEnv.db.refreshToken.findUnique({
                where: { tokenHash: testTokenHash },
            });
            expect(oldTokenDB?.revokedAt).not.toBeNull();

            const newTokenDB = await testEnv.db.refreshToken.findUnique({
                where: { tokenHash },
            });
            expect(newTokenDB?.revokedAt).toBeNull();
        });
        test('Should throw unauthorised if code is expired', async () => {
            testEnv.redis.expire(`user-code:${codeHash}`, 0);
            await expect(testEnv.authService.loginMfa({ code: codePlainStr })).rejects.toThrow(
                'Invalid or expired login code',
            );
        });
        test('Should throw  unauthorised if code not found', async () => {
            await testEnv.redis.del(`user-code:${codeHash}`);
            await expect(testEnv.authService.loginMfa({ code: codePlainStr })).rejects.toThrow(
                'Invalid or expired login code',
            );
        });
        test('Should throw  unauthorised if user not found', async () => {
            const existingDeviceId = 'existingDeviceId';
            await seedRefreshToken(testEnv.db, {
                deviceId: existingDeviceId,
                userId: user.id,
            });
            await testEnv.db.user.delete({ where: { id: user.id } });
            await expect(
                testEnv.authService.loginMfa({
                    code: codePlainStr,
                    existingDeviceId,
                }),
            ).rejects.toThrow('Invalid or expired verification code');
        });
    });
    describe('logout', () => {
        let accessToken: string;
        let deviceId: string;
        let user: User;
        beforeEach(async () => {
            user = await seedUser(testEnv.db, { verified: true, password: 'password' });
            const code = 'loginCode';
            const codeHash = hashString(code);
            await seedCode(testEnv.redis, 'LOGIN', { userId: user.id, codeHash });
            ({ accessToken, deviceId } = await testEnv.authService.loginMfa({ code }));
        });
        test('Successfully revokes tokens from database', async () => {
            const id = getUserIdFromToken(accessToken);
            await testEnv.authService.logout({ id, deviceId });
            const dbToken = await testEnv.db.refreshToken.findFirst({
                where: { deviceId, userId: id },
            });
            expect(dbToken!.revokedAt).toBeInstanceOf(Date);
        });
        test('Does not logout other devices', async () => {
            const otherDevice = 'otherDevie';
            await seedRefreshToken(testEnv.db, {
                deviceId: otherDevice,
                userId: user.id,
            });

            const id = getUserIdFromToken(accessToken);
            await testEnv.authService.logout({ id, deviceId });

            const userTokens: RefreshToken[] = await testEnv.db.refreshToken.findMany({
                where: { userId: id },
            });

            const dbLoggedOutToken = userTokens.find((t) => t.deviceId === deviceId);
            expect(dbLoggedOutToken!.revokedAt).toBeInstanceOf(Date);

            const dbLoggedInToken = userTokens.find((t) => t.deviceId === otherDevice);
            expect(dbLoggedInToken!.revokedAt).toBeNull();
        });
    });
    describe('Issue code for email', () => {
        test('Should add code to testEnv.db for user with valid email and call email service', async () => {
            const user = await seedUser(testEnv.db);
            const code = await testEnv.authService.issueCodeForEmail({
                email: user.email,
                codeType: 'PASSWORD_RESET',
            });
            expect(code).not.toBeNull();
            const cachedCode = await testEnv.redis.get(`user-code:${user.id}:PASSWORD_RESET`);
            expect(cachedCode).not.toBeNull();
            expect(emailService.sendCodeEmail).toHaveBeenCalledTimes(1);
        });

        test('Replaces existing password reset code in testEnv.redis if user already has one', async () => {
            const user = await seedUser(testEnv.db, {
                ...userInputData,
                verified: true,
            });
            await testEnv.authService.issueCodeForEmail({
                email: userInputData.email,
                codeType: 'PASSWORD_RESET',
            });
            const firstCode = await testEnv.redis.get(`user-code:${user.id}:${'PASSWORD_RESET'}`);
            expect(firstCode).not.toBeNull();

            const firstHash = JSON.parse(firstCode!).codeHash;
            const firstStoredHash = await testEnv.redis.get(`user-code:${firstHash}`);
            expect(firstStoredHash).not.toBeNull();

            await testEnv.authService.issueCodeForEmail({
                email: userInputData.email,
                codeType: 'PASSWORD_RESET',
            });
            const secondCode = await testEnv.redis.get(`user-code:${user.id}:${'PASSWORD_RESET'}`);
            expect(secondCode).not.toBeNull();

            const oldStoredHash = await testEnv.redis.get(`user-code:${firstHash}`);
            expect(oldStoredHash).toBeNull();
        });
        test('Should return null if email not in testEnv.db', async () => {
            const code = await testEnv.authService.issueCodeForEmail({
                email: 'bad@email.com',
                codeType: 'PASSWORD_RESET',
            });
            expect(code).toBeNull();
            expect(emailService.sendCodeEmail).toHaveBeenCalledTimes(0);
        });
    });

    describe('Verify user', () => {
        test('Should remove code from testEnv.db and set user to verified', async () => {
            const code = 'test-code';
            const codeHash = hashString(code);
            const user = await seedUser(testEnv.db, { verified: false });
            await seedCode(testEnv.redis, 'VERIFICATION', { userId: user.id, codeHash });

            await testEnv.authService.verifyUser(code);
            const cachedCode = await testEnv.redis.get(`user-code:${user.id}:VERIFICATION`);
            expect(cachedCode).toBeNull();

            const dbUser = await testEnv.db.user.findUnique({ where: { id: user.id } });
            expect(dbUser!.verified).toBe(true);
        });
        test('Should unauthorised error if code is not in the testEnv.db', async () => {
            const user = await seedUser(testEnv.db, { verified: false });
            const code = 'test-code';
            await expect(testEnv.authService.verifyUser(code)).rejects.toThrow(
                new UnauthorisedError('Invalid or expired verification code'),
            );
            const cachedCode = await testEnv.redis.get(`user-code:${user.id}:VERIFICATION`);
            expect(cachedCode).toBeNull();

            const dbUser = await testEnv.db.user.findUnique({ where: { id: user.id } });
            expect(dbUser!.verified).toBe(false);
        });
    });

    describe('Reset password', () => {
        let user: User;
        beforeEach(async () => {
            user = await seedUser(testEnv.db, { ...userInputData, verified: true });
            const code = 'loginCode';
            const codeHash = hashString(code);
            await seedCode(testEnv.redis, 'LOGIN', { codeHash, userId: user.id });
            await testEnv.authService.loginMfa({ code });
        });
        test('Succesfully updates password in database, removes reset code and revokes all user tokens', async () => {
            const newPassword = 'newPassword';
            const code = await testEnv.codeService.issueCodeForUser({
                data: { user, codeType: 'PASSWORD_RESET' },
            });

            const storedCode = await testEnv.redis.get(`user-code:${user.id}:PASSWORD_RESET`);
            const codeHash = JSON.parse(storedCode!).codeHash;
            const returnedUser = await testEnv.authService.resetPassword({
                code: code!,
                password: newPassword,
            });
            expect(returnedUser).not.toBeNull();
            const dbUser = await testEnv.db.user.findUnique({ where: { id: user.id } });
            const dbPassword = dbUser!.password;
            expect(await bcrypt.compare(newPassword, dbPassword)).toBe(true);
            const cachedCode = await testEnv.redis.get(`user-code:${user.id}:PASSWORD_RESET`);
            expect(cachedCode).toBeNull();
            const storedCodeHash = await testEnv.redis.get(`user-code:${codeHash}`);
            expect(storedCodeHash).toBeNull();

            const userTokens = await testEnv.db.refreshToken.findMany({
                where: { userId: user.id },
            });
            expect(userTokens).toHaveLength(1);
            expect(userTokens[0].revokedAt).toBeInstanceOf(Date);
        });
        test('All tokens revoked across all device ids for user', async () => {
            await seedRefreshToken(testEnv.db, { userId: user.id });
            const code = await testEnv.codeService.issueCodeForUser({
                data: { user, codeType: 'PASSWORD_RESET' },
            });
            await testEnv.authService.resetPassword({
                code: code!,
                password: 'newPassword',
            });

            const userTokens = await testEnv.db.refreshToken.findMany({
                where: { userId: user.id },
            });
            expect(userTokens).toHaveLength(2);
            expect(userTokens.every((t) => t.revokedAt instanceof Date)).toBe(true);
        });

        test('Throws if code not in testEnv.db', async () => {
            await expect(
                testEnv.authService.resetPassword({
                    code: 'nonexistentcode',
                    password: 'newPassword',
                }),
            ).rejects.toThrow('Invalid or expired password reset code');
        });
        test('Throws if user not found', async () => {
            const plainCode = randomBytes(32).toString('hex');
            const codeHash = hashString(plainCode);
            const codeInput = buildCodeInput('PASSWORD_RESET', { userId: user.id, codeHash });
            await seedCode(testEnv.redis, 'PASSWORD_RESET', codeInput);
            await testEnv.db.user.delete({ where: { id: user.id } });
            await expect(
                testEnv.authService.resetPassword({
                    code: plainCode,
                    password: 'newPassword',
                }),
            ).rejects.toThrow('Invalid or expired password reset code');
        });
        test('Throws if code is expired', async () => {
            const code = await testEnv.codeService.issueCodeForUser({
                data: { user, codeType: 'PASSWORD_RESET' },
            });

            const codeHash = hashString(code!);
            await testEnv.redis.expire(`user-code:${codeHash}`, 0);

            await expect(
                testEnv.authService.resetPassword({
                    code: code!,
                    password: 'newPassword',
                }),
            ).rejects.toThrow('Invalid or expired password reset code');
        });
    });
});
