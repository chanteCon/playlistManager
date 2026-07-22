import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { RedisClientType } from 'redis';

export const startRedisContainer = async () => {
    console.log('Stating redis container');
    const redisContainer = await new RedisContainer('redis:7.2').start();
    const redisUrl = redisContainer.getConnectionUrl();
    return { redisContainer, redisUrl };
};

export const stopRedis = async (redis: RedisClientType, redisContainer: StartedRedisContainer) => {
    await redis.quit();
    await redisContainer.stop();
};
