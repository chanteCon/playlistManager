import { AuthUser, ConsumedRefreshToken } from 'features/auth/types';
import { CreateTokenInput } from '__tests__/shared/factories';
import { PrismaClient, RefreshToken } from '@prisma/client';
import { RedisClientType } from 'redis';
import { PrismaClientTx } from 'database/prisma/dbType';

export type RefreshTokenRepo = ReturnType<typeof createTokenRepo>;
type TokenRepoDeps = { db: PrismaClient; redis?: RedisClientType };

export const createTokenRepo = ({ db }: TokenRepoDeps) => {
    const save = async ({ data }: { data: CreateTokenInput }): Promise<RefreshToken> => {
        return await db.refreshToken.create({ data });
    };

    const revokeAllForDeviceId = async (authUser: AuthUser) => {
        const { id: userId, deviceId } = authUser;
        await db.refreshToken.updateMany({
            where: { userId, revokedAt: null, deviceId },
            data: { revokedAt: new Date(Date.now()) },
        });
    };

    const revokeAllUserTokens = async (userId: string, tx: PrismaClientTx = db) => {
        await tx.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date(Date.now()) },
        });
    };

    const consume = async (tokenHash: string): Promise<ConsumedRefreshToken | undefined> => {
        const [token] = await db.$queryRaw<ConsumedRefreshToken[]>`
    WITH old_token as (
        SELECT "revokedAt", "id"
        FROM "RefreshToken"
        WHERE "tokenHash" = ${tokenHash}
    )
    UPDATE "RefreshToken" t
    SET "revokedAt" = COALESCE(t."revokedAt", NOW())
    FROM "User" u, old_token o
    WHERE o.id = t.id AND t."userId" = u."id"
    RETURNING
        t."expiresAt",
        t."userId",
        t."deviceId",
        (o."revokedAt" IS NOT NULL) AS "isReuse",
        u."verified" AS "userVerified"
  `;
        return token;
    };

    return {
        save,
        consume,
        revokeAllForDeviceId,
        revokeAllUserTokens,
    };
};
