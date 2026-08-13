import { PrismaClient } from '@prisma/client';
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

    const redis = createRedisClient(process.env.REDIS_URL!);
    await redis.connect();

    return {
        db,
        redis,
        teardown: async () => {
            await redis.quit();
            await db.$disconnect();
        },
    };
};
