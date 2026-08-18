import { UserCode } from 'features/auth/types';
import { RedisClientType } from 'redis';
import { NotFoundError } from 'shared/errors/errors';
import { logger } from 'shared/logger/logger';

type CodeRepoDeps = { redis: RedisClientType };

export type CodeRepo = ReturnType<typeof createCodeRepo>;

export type CreateCodeInput = {
    userId: string;
    codeHash: string;
    codeType: 'VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN';
    expiresAt: Date;
};

const handleMultiError = (res: any) => {
    if (!res) {
        logger.error('Redis transaction failed', res);
        throw new Error('Redis transaction failed');
    }
};

export const createCodeRepo = ({ redis }: CodeRepoDeps) => {
    const save = async ({ data }: { data: CreateCodeInput }): Promise<void> => {
        const { codeHash, userId, codeType, expiresAt } = data;
        const key = `user-code:${codeHash}`;
        const userCodeKey = `user-code:${userId}:${codeType}`;
        const existingUserCodeOfType = await redis.get(userCodeKey);
        const multi = redis.multi();
        if (existingUserCodeOfType) {
            multi.del(userCodeKey);
            const codeEntry = JSON.parse(existingUserCodeOfType) as UserCode;
            multi.del(`user-code:${codeEntry.codeHash}`);
        }
        const ttl = Math.floor((data.expiresAt.getTime() - Date.now()) / 1000);
        multi.set(key, JSON.stringify({ codeType, userId, expiresAt }), {
            EX: ttl,
        });
        multi.set(userCodeKey, JSON.stringify({ codeHash, userId, expiresAt }), {
            EX: ttl,
        });
        const res = await multi.exec();
        handleMultiError(res);
    };

    const remove = async (codeHash: string): Promise<UserCode> => {
        const code = await redis.get(`user-code:${codeHash}`);
        if (!code) {
            throw new NotFoundError(`Code not found`);
        }
        const codeData = JSON.parse(code) as UserCode;
        const multi = redis.multi();
        multi.del(`user-code:${codeHash}`);
        multi.del(`user-code:${codeData.userId}:${codeData.codeType}`);
        const res = await multi.exec();
        handleMultiError(res);
        return codeData as UserCode;
    };

    const removeAllForUser = async (userId: string): Promise<void> => {
        await redis.del(`user-code:${userId}:VERIFICATION`);
        await redis.del(`user-code:${userId}:LOGIN`);
    };

    return {
        save,
        remove,
        removeAllForUser,
    };
};
