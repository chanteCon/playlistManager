import { randomUUID, randomBytes, createHash } from 'crypto';
import { RefreshToken } from '@prisma/client';

const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN;

export type CreateTokenInput = Omit<RefreshToken, 'id' | 'revokedAt' | 'createdAt'>;

export const buildRefreshTokenInput = (
    overrides: Partial<CreateTokenInput> = {},
): CreateTokenInput => {
    return {
        tokenHash: createHash('sha256').update(randomBytes(64).toString('hex')).digest('hex'),
        expiresAt: new Date(Date.now() + parseInt(REFRESH_TOKEN_EXPIRES_IN!)),
        userId: randomUUID(),
        deviceId: randomBytes(32).toString('hex'),
        ...overrides,
    };
};

export const buildRefreshToken = (overrides: Partial<RefreshToken> = {}): RefreshToken => {
    const tokenData = buildRefreshTokenInput();
    return {
        id: randomUUID(),
        createdAt: new Date(),
        revokedAt: null,
        ...tokenData,
        ...overrides,
    };
};
