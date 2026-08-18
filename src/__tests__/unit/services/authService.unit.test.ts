import {
    mockUserService,
    mockCodeService,
    mockTokenService,
} from '__tests__/shared/mocks/services';

import { createAuthService } from 'features/auth/services/authService';

import { PublicUser, User } from 'features/user/types';
import { CreateAccountInput, UserCode } from 'features/auth/types';
import { buildUser, buildPublicUser, buildUserInput } from '__tests__/shared/factories';
import { buildCode } from '__tests__/shared/factories';

import { NotFoundError, UnauthorisedError } from 'shared/errors/errors';

import { randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

import { generateRandomString, hashPassword, hashString } from 'shared/utils/hashing';
import { fakeTx, mockTxRunner } from '__tests__/shared/mocks/mockTxRunner';

const DEVICE_ID_BYTES = 32;

let userInputData: CreateAccountInput;
let user: PublicUser;
let privateUser: User;

const authService = createAuthService({
    services: {
        userService: mockUserService,
        codeService: mockCodeService,
        tokenService: mockTokenService,
    },
    txRunner: mockTxRunner,
});

describe('Unit tests: Auth service', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        userInputData = buildUserInput();
        user = buildPublicUser(userInputData);
        const passwordHash = await hashPassword(userInputData.password);
        privateUser = buildUser({ ...user, password: passwordHash });
    });
    describe('Register', () => {
        test('Create user account and issue verification code', async () => {
            mockUserService.create.mockResolvedValueOnce(buildUser({ ...user, verified: false }));
            mockCodeService.issueCodeForUser.mockResolvedValueOnce('code');

            await authService.register(userInputData);

            expect(mockUserService.create).toHaveBeenCalledTimes(1);
            const calledArgs = (mockUserService.create as jest.Mock).mock.calls[0][0];
            const { data } = calledArgs;
            const hashWasSaved = await bcrypt.compare(userInputData.password, data.password);
            expect(hashWasSaved).toBe(true);
            expect(data).toMatchObject({ ...userInputData, password: expect.any(String) });
        });
    });

    describe('startLogin', () => {
        test('Successfully verifies user credentials and issues startLogin code to email', async () => {
            const code = 'mock_code';
            mockUserService.findInternalUserByEmail.mockResolvedValueOnce(privateUser);
            mockCodeService.issueCodeForUser.mockResolvedValueOnce(code);

            const { email, password } = userInputData;
            await authService.startLogin({ email, password });

            expect(mockUserService.findInternalUserByEmail).toHaveBeenCalledTimes(1);
            expect(mockUserService.findInternalUserByEmail).toHaveBeenCalledWith({ email });
            expect(mockCodeService.issueCodeForUser).toHaveBeenCalledTimes(1);
            expect(mockCodeService.issueCodeForUser).toHaveBeenCalledWith({
                data: {
                    user: privateUser,
                    codeType: 'LOGIN',
                },
            });
        });
        test('Throws if cannot get user', async () => {
            mockUserService.findInternalUserByEmail.mockRejectedValueOnce(
                new NotFoundError('User not found'),
            );
            const { email, password } = userInputData;

            await expect(authService.startLogin({ email, password })).rejects.toThrow(
                'Incorrect email or password',
            );

            expect(mockUserService.findInternalUserByEmail).toHaveBeenCalledTimes(1);
            expect(mockUserService.findInternalUserByEmail).toHaveBeenCalledWith({ email });
            expect(mockCodeService.issueCodeForUser).toHaveBeenCalledTimes(0);
        });
        test('Throws if password does not match', async () => {
            mockUserService.findInternalUserByEmail.mockResolvedValueOnce(privateUser);
            await expect(
                authService.startLogin({
                    email: userInputData.email,
                    password: 'nonMatchingPassword',
                }),
            ).rejects.toThrow('Incorrect email or password');
            expect(mockCodeService.issueCodeForUser).toHaveBeenCalledTimes(0);
        });
        test('Throws if unexpected error occurs', async () => {
            mockUserService.findInternalUserByEmail.mockRejectedValueOnce(
                new Error('Unexpected error'),
            );
            const { email, password } = userInputData;

            await expect(authService.startLogin({ email, password })).rejects.toThrow(
                'Unexpected error',
            );
        });
    });

    describe('Login Mfa', () => {
        const code = 'mock_code';
        test('Successfully issues tokens to user with valid code', async () => {
            const id = randomUUID();
            mockCodeService.verifyCode.mockResolvedValueOnce(id);
            mockTokenService.generateTokens.mockResolvedValueOnce({
                accessToken: 'accessToken',
                refreshToken: 'refreshToken',
            });
            mockUserService.findAuthUserById.mockResolvedValueOnce(user);
            const { accessToken, refreshToken } = await authService.loginMfa({ code });

            expect(accessToken).toEqual('accessToken');
            expect(refreshToken).toEqual('refreshToken');

            expect(mockCodeService.verifyCode).toHaveBeenCalledWith({ code, codeType: 'LOGIN' });
            expect(mockTokenService.generateTokens).toHaveBeenCalledWith({
                authUser: expect.objectContaining({ id }),
            });
        });
        test('Uses existing device id if provided', async () => {
            const id = randomUUID();
            const existingDeviceId = generateRandomString(32);
            mockCodeService.verifyCode.mockResolvedValueOnce(id);
            mockUserService.findAuthUserById.mockResolvedValueOnce(user);
            mockTokenService.generateTokens.mockResolvedValueOnce({
                accessToken: 'accessToken',
                refreshToken: 'refreshToken',
            });
            mockTokenService.revokeAllForDeviceId.mockResolvedValueOnce();
            const { accessToken, refreshToken, deviceId } = await authService.loginMfa({
                code,
                existingDeviceId,
            });

            expect(accessToken).toEqual('accessToken');
            expect(refreshToken).toEqual('refreshToken');
            expect(deviceId).toEqual(existingDeviceId);

            expect(mockCodeService.verifyCode).toHaveBeenCalledWith({
                code,
                codeType: 'LOGIN',
            });
            expect(mockTokenService.revokeAllForDeviceId).toHaveBeenLastCalledWith({
                deviceId: existingDeviceId,
                userId: id,
            });
            expect(mockTokenService.generateTokens).toHaveBeenCalledWith({
                authUser: { id, deviceId: existingDeviceId },
            });
        });
    });

    describe('Logout', () => {
        test('Successfully logs out user and revokes their tokens for their device id', async () => {
            mockTokenService.revokeAllForDeviceId.mockResolvedValueOnce();
            const authUser = {
                deviceId: randomBytes(DEVICE_ID_BYTES).toString('hex'),
                id: privateUser.id,
            };
            await expect(authService.logout(authUser)).resolves.toBeUndefined();
            expect(mockTokenService.revokeAllForDeviceId).toHaveBeenCalledTimes(1);
            expect(mockTokenService.revokeAllForDeviceId).toHaveBeenCalledWith({
                deviceId: authUser.deviceId,
                userId: authUser.id,
            });
        });
        test('Does not propagate errors', async () => {
            mockTokenService.revokeAllForDeviceId.mockRejectedValueOnce(new Error('Db down'));
            const authUser = {
                deviceId: randomBytes(DEVICE_ID_BYTES).toString('hex'),
                id: privateUser.id,
            };
            await expect(authService.logout(authUser)).resolves.toBeUndefined();
        });
    });

    describe('Verify user', () => {
        let privateUser: User;
        const code = 'test-code';
        const codeHash = hashString(code);

        beforeEach(() => {
            privateUser = buildUser({ ...user, verified: false });
        });

        test('Should verify user and log them in', async () => {
            const codeData: UserCode = buildCode('VERIFICATION', { userId: user.id, codeHash });
            mockCodeService.verifyCode.mockResolvedValueOnce(codeData.userId);
            mockUserService.verify.mockResolvedValueOnce();
            mockTokenService.generateTokens.mockResolvedValueOnce({
                accessToken: 'accessToken',
                refreshToken: 'refreshToken',
            });

            await expect(authService.verifyUser(code)).resolves.not.toThrow();

            expect(mockCodeService.verifyCode).toHaveBeenCalledWith({
                code,
                codeType: 'VERIFICATION',
            });
            expect(mockUserService.verify).toHaveBeenCalledWith(privateUser.id);
            expect(mockTokenService.generateTokens).toHaveBeenCalledWith({
                authUser: expect.objectContaining({ id: user.id }),
            });
        });

        test('Should throw if code service fails', async () => {
            mockCodeService.verifyCode.mockRejectedValue(
                new UnauthorisedError('Invalid or expired verification code'),
            );

            await expect(authService.verifyUser(code)).rejects.toThrow(
                new UnauthorisedError('Invalid or expired verification code'),
            );

            expect(mockCodeService.verifyCode).toHaveBeenCalledWith({
                code,
                codeType: 'VERIFICATION',
            });
            expect(mockUserService.verify).not.toHaveBeenCalled();
        });

        test('Should throw if user not found', async () => {
            mockCodeService.verifyCode.mockResolvedValueOnce(privateUser.id);
            mockUserService.verify.mockRejectedValueOnce(new NotFoundError('User not found'));

            await expect(authService.verifyUser(code)).rejects.toThrow(
                new UnauthorisedError('Invalid or expired verification code'),
            );

            expect(mockCodeService.verifyCode).toHaveBeenCalledWith({
                code,
                codeType: 'VERIFICATION',
            });
            expect(mockUserService.verify).toHaveBeenCalledWith(privateUser.id);
        });
    });
    describe('ResetPassword', () => {
        const code = 'testCode';
        const password = 'newPassword123!';
        test('Successfully resets user password, logs them out and returns their details', async () => {
            mockCodeService.verifyCode.mockResolvedValueOnce(user.id);
            mockUserService.updatePassword.mockResolvedValueOnce(user);
            mockTokenService.revokeAllForUser.mockResolvedValueOnce(undefined);

            const updatedUser = await authService.resetPassword({ code, password });

            expect(updatedUser).toEqual(user);
            expect(mockCodeService.verifyCode).toHaveBeenCalledWith({
                code,
                codeType: 'PASSWORD_RESET',
            });
            expect(mockUserService.updatePassword).toHaveBeenCalledWith(
                expect.objectContaining({ id: user.id }),
            );

            expect(mockTokenService.revokeAllForUser).toHaveBeenCalledWith(user.id, fakeTx);
        });
        test('Throws if code verification fails', async () => {
            mockCodeService.verifyCode.mockRejectedValueOnce(
                new UnauthorisedError('Invalid or expired password reset code'),
            );

            await expect(authService.resetPassword({ code, password })).rejects.toThrow(
                'Invalid or expired password reset code',
            );

            expect(mockCodeService.verifyCode).toHaveBeenCalledWith({
                code,
                codeType: 'PASSWORD_RESET',
            });
            expect(mockUserService.updatePassword).toHaveBeenCalledTimes(0);
        });
        test('Throws if user does not exist', async () => {
            mockCodeService.verifyCode.mockResolvedValueOnce(user.id);
            mockUserService.updatePassword.mockRejectedValueOnce(
                new NotFoundError('User not found'),
            );

            await expect(authService.resetPassword({ code, password })).rejects.toThrow(
                'Invalid or expired password reset code',
            );

            expect(mockUserService.updatePassword).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: user.id,
                }),
            );

            expect(mockTokenService.revokeAllForUser).toHaveBeenCalledTimes(0);
        });
        test('Throws if global logout fails', async () => {
            mockCodeService.verifyCode.mockResolvedValueOnce(user.id);
            mockUserService.updatePassword.mockResolvedValueOnce(user);
            mockTokenService.revokeAllForUser.mockRejectedValueOnce(new Error('Db down'));

            await expect(authService.resetPassword({ code, password })).rejects.toThrow('Db down');

            expect(mockTokenService.revokeAllForUser).toHaveBeenCalledWith(user.id, fakeTx);
        });
        test('Throws if unexpected error occurs', async () => {
            mockCodeService.verifyCode.mockRejectedValueOnce(new Error('Unexpected error'));

            await expect(authService.resetPassword({ code, password })).rejects.toThrow(
                'Unexpected error',
            );

            expect(mockCodeService.verifyCode).toHaveBeenCalledWith({
                code,
                codeType: 'PASSWORD_RESET',
            });
            expect(mockUserService.updatePassword).toHaveBeenCalledTimes(0);
        });
    });
    describe('Issue code for email', () => {
        test('Successfully issues code for email', async () => {
            mockUserService.findInternalUserByEmail.mockResolvedValueOnce(privateUser);
            mockCodeService.issueCodeForUser.mockResolvedValueOnce('code');

            const { email } = userInputData;
            const code = await authService.issueCodeForEmail({
                email,
                codeType: 'VERIFICATION',
            });

            expect(code).toEqual('code');
            expect(mockUserService.findInternalUserByEmail).toHaveBeenCalledWith({ email });
            expect(mockCodeService.issueCodeForUser).toHaveBeenCalledWith({
                data: {
                    user: privateUser,
                    codeType: 'VERIFICATION',
                },
            });
        });
        test('Returns null if user not found', async () => {
            mockUserService.findInternalUserByEmail.mockRejectedValueOnce(
                new NotFoundError('User not found'),
            );

            const { email } = userInputData;
            const code = await authService.issueCodeForEmail({
                email,
                codeType: 'VERIFICATION',
            });

            expect(code).toBeNull();
            expect(mockUserService.findInternalUserByEmail).toHaveBeenCalledWith({ email });
            expect(mockCodeService.issueCodeForUser).toHaveBeenCalledTimes(0);
        });
        test('Throws if unexpected error occurs', async () => {
            mockUserService.findInternalUserByEmail.mockRejectedValueOnce(
                new Error('Unexpected error'),
            );

            const { email } = userInputData;
            await expect(
                authService.issueCodeForEmail({
                    email,
                    codeType: 'VERIFICATION',
                }),
            ).rejects.toThrow('Unexpected error');

            expect(mockUserService.findInternalUserByEmail).toHaveBeenCalledWith({ email });
            expect(mockCodeService.issueCodeForUser).toHaveBeenCalledTimes(0);
        });
    });
});
