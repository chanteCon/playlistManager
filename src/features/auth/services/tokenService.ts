import { UnauthorisedError } from 'shared/errors/errors';

import { AuthUser, ConsumedRefreshToken, Tokens } from 'features/auth/types';
import { RefreshTokenRepo } from '../repos/refreshTokenRepo';

import * as jwt from 'jsonwebtoken';
import { generateRandomString, hashString } from 'shared/utils/hashing';
import { authConfig } from 'config/auth.config';
import { PrismaClientTx } from 'database/prisma/dbType';

type TokenServiceDeps = {
    refreshTokenRepo: RefreshTokenRepo;
};

export type TokenService = ReturnType<typeof createTokenService>;

export const createTokenService = ({ refreshTokenRepo }: TokenServiceDeps) => {
    const { accessTokenSecret, accessTokenExp, refreshTokenExp } = authConfig;

    ////////////// Internal functions ////////////////
    const _generateAccessToken = ({ id, deviceId }: AuthUser): string => {
        return jwt.sign({ id, deviceId }, accessTokenSecret, {
            expiresIn: Number(accessTokenExp),
        });
    };

    const _generateRefreshToken = async ({ authUser }: CreateTokenParams): Promise<string> => {
        const refreshToken = generateRandomString(64);
        const expiresMs = parseInt(refreshTokenExp) * 1000;
        const tokenHash = hashString(refreshToken);
        await refreshTokenRepo.save({
            data: {
                userId: authUser.id,
                tokenHash,
                deviceId: authUser.deviceId,
                expiresAt: new Date(Date.now() + expiresMs),
            },
        });
        return refreshToken;
    };

    const _consumeRefreshToken = async (refreshToken: string): Promise<ConsumedRefreshToken> => {
        const tokenHash = hashString(refreshToken);
        const consumed = await refreshTokenRepo.consume(tokenHash);
        if (!consumed) throw new UnauthorisedError('Invalid token');
        return consumed;
    };

    ////////////// Exported functions ////////////////

    type CreateTokenParams = { authUser: AuthUser };
    const generateTokens = async ({ authUser }: CreateTokenParams): Promise<Tokens> => {
        const { id, deviceId } = authUser;
        const accessToken = _generateAccessToken({ id, deviceId });
        const refreshToken = await _generateRefreshToken({ authUser });
        return { accessToken, refreshToken };
    };

    const rotateTokens = async (refreshToken: string): Promise<Tokens> => {
        const consumed = await _consumeRefreshToken(refreshToken);
        await revokeAllForDeviceId({ userId: consumed.userId, deviceId: consumed.deviceId });
        const expired = Date.now() > consumed.expiresAt.getTime();
        if (expired || consumed.isReuse || !consumed.userVerified) {
            throw new UnauthorisedError('Invalid token');
        }
        return await generateTokens({
            authUser: { id: consumed.userId, deviceId: consumed.deviceId },
        });
    };

    const revokeAllForDeviceId = async ({
        deviceId,
        userId,
    }: {
        deviceId: string;
        userId: string;
    }) => {
        await refreshTokenRepo.revokeAllForDeviceId({ deviceId, id: userId });
    };

    const revokeAllForUser = async (userId: string, tx?: PrismaClientTx) => {
        await refreshTokenRepo.revokeAllUserTokens(userId, tx);
    };

    return {
        rotateTokens,
        generateTokens,
        revokeAllForDeviceId,
        revokeAllForUser,
    };
};
