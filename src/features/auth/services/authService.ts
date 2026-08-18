import { ForbiddenError, NotFoundError, UnauthorisedError } from 'shared/errors/errors';
import { logger } from 'shared/logger/logger';

import { CreateAccountInput, AuthUser, LoginInput, Tokens, EmailCodeInput } from '../types';
import { TokenService } from './tokenService';
import { ResetPasswordInput } from '../types';
import { UpdatePasswordParams, User } from 'features/user/types';
import { UserService } from 'features/user/userService';
import { PublicUser } from 'features/user/types';

import { CodeType } from '../types';
import { comparePassword, generateRandomString, hashPassword } from 'shared/utils/hashing';
import { CodeService } from 'shared/userCodes/codeService';
import { TxRunner } from 'database/prisma/dbType';

const DEVICE_ID_BYTES = 32;

type AuthServiceDeps = {
    services: {
        userService: UserService;
        codeService: CodeService;
        tokenService: TokenService;
    };
    txRunner: TxRunner;
};

export type AuthService = ReturnType<typeof createAuthService>;

export const createAuthService = ({ services, txRunner }: AuthServiceDeps) => {
    const { userService, codeService, tokenService } = services;

    ////////////// Internal functions ////////////////

    const _getUserForLogin = async (email: string): Promise<User> => {
        try {
            return await userService.findInternalUserByEmail({ email });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw new UnauthorisedError('Incorrect email or password');
            }
            throw error;
        }
    };

    const _updateUserPasswordAndLogout = async ({
        id,
        passwordHash,
    }: UpdatePasswordParams): Promise<PublicUser> => {
        try {
            return await txRunner.run(async (tx) => {
                const user = await userService.updatePassword({
                    tx,
                    id,
                    passwordHash,
                });
                await tokenService.revokeAllForUser(id, tx);

                return user;
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw new ForbiddenError('Invalid or expired password reset code');
            }
            throw error;
        }
    };

    const _login = async (existingDeviceId: string | undefined, userId: string) => {
        if (existingDeviceId) {
            await tokenService.revokeAllForDeviceId({ deviceId: existingDeviceId, userId });
        }
        const deviceId = existingDeviceId
            ? existingDeviceId
            : generateRandomString(DEVICE_ID_BYTES);
        const authUser = { id: userId, deviceId };
        const { accessToken, refreshToken } = await tokenService.generateTokens({ authUser });
        return { accessToken, refreshToken, deviceId };
    };

    ////////////// Exported functions ////////////////

    const register = async ({ email, password, username }: CreateAccountInput): Promise<void> => {
        const hashedPassword = await hashPassword(password);
        const user = await userService.create({
            data: { email, username, password: hashedPassword },
        });
        const data = {
            user: { id: user.id, verified: user.verified, email: user.email },
            codeType: 'VERIFICATION' as CodeType,
        };
        await codeService.issueCodeForUser({ data });
    };

    const startLogin = async ({ email, password }: LoginInput): Promise<void> => {
        const user = await _getUserForLogin(email);
        const match = await comparePassword(password, user.password);
        if (!match) {
            throw new UnauthorisedError('Incorrect email or password');
        }
        await codeService.issueCodeForUser({ data: { user, codeType: 'LOGIN' } });
    };

    type LoginMfaInput = { code: string; existingDeviceId?: string };
    const loginMfa = async ({
        code,
        existingDeviceId,
    }: LoginMfaInput): Promise<Tokens & { deviceId: string }> => {
        const userId = await codeService.verifyCode({ code, codeType: 'LOGIN' });
        await userService.findAuthUserById(userId);
        return await _login(existingDeviceId, userId);
    };

    const logout = async (user: AuthUser) => {
        try {
            await tokenService.revokeAllForDeviceId({ deviceId: user.deviceId!, userId: user.id });
        } catch (error) {
            logger.error(error);
        }
    };

    const verifyUser = async (
        code: string,
        existingDeviceId?: string,
    ): Promise<Tokens & { deviceId: string }> => {
        try {
            const userId = await codeService.verifyCode({ code, codeType: 'VERIFICATION' });
            await userService.verify(userId);
            return await _login(existingDeviceId, userId);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw new UnauthorisedError('Invalid or expired verification code');
            }
            throw error;
        }
    };

    const resetPassword = async ({ code, password }: ResetPasswordInput): Promise<PublicUser> => {
        const userId = await codeService.verifyCode({ code, codeType: 'PASSWORD_RESET' });
        const passwordHash = await hashPassword(password);
        return await _updateUserPasswordAndLogout({ id: userId, passwordHash });
    };

    const issueCodeForEmail = async ({
        email,
        codeType,
    }: EmailCodeInput): Promise<string | null> => {
        try {
            const user = await userService.findInternalUserByEmail({ email });
            return await codeService.issueCodeForUser({ data: { user, codeType } });
        } catch (error) {
            if (error instanceof NotFoundError) {
                return null;
            }
            throw error;
        }
    };

    return {
        startLogin,
        loginMfa,
        logout,
        register,
        resetPassword,
        verifyUser,
        issueCodeForEmail,
    };
};
