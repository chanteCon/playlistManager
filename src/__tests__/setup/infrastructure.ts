import { PrismaClient } from '@prisma/client';
import { startRedisContainer, stopRedis } from '__tests__/shared/helpers/redisTestUtils';
import { createPrismaClient } from 'database/prisma/prisma';
import { RedisClientType } from 'redis';
import { createRedisClient } from 'redisClient/redis';

export type InfraStructure = {
    redis: RedisClientType;
    db: PrismaClient;
    teardown: () => Promise<void>;
};

export const createTestInfrastructure = async (): Promise<InfraStructure> => {
    const db = createPrismaClient(process.env.DATABASE_URL!);
    await db.$connect();
    const { redisContainer, redisUrl } = await startRedisContainer();
    const redis = createRedisClient(redisUrl);
    await redis.connect();
    const teardown = async () => {
        await stopRedis(redis, redisContainer);
        await db.$disconnect();
    };
    return { redis, db, teardown };
};
