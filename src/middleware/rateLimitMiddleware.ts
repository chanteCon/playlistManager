import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { RedisClientType } from 'redis';
type RateLimitOptions = { max?: number; windowMs?: number; message?: string; keyPrefix?: string };

export const createRateLimiter = (
    redisClient: RedisClientType,
    { max, windowMs, message, keyPrefix }: RateLimitOptions,
) => {
    return rateLimit({
        store: new RedisStore({
            sendCommand: (command: string, ...args: string[]) => {
                return redisClient.sendCommand([command, ...args]);
            },
        }),
        windowMs: windowMs ?? 10 * 60 * 1000,
        max,
        message: message ?? 'Too many requests, try again later',
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: (req) => {
            return `${keyPrefix ?? 'global'}:ip:${ipKeyGenerator(req.ip as string)}`;
        },
    });
};
