import { createClient, RedisClientType } from 'redis';
import { logger } from 'shared/logger/logger';

export const createRedisClient = (redisUrl: string): RedisClientType => {
    try {
        return createClient({ url: redisUrl });
    } catch (error) {
        logger.error(error);
        throw error;
    }
};
