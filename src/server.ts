import { config } from 'dotenv';
import { createPrismaClient } from 'database/prisma/prisma';
import { createRedisClient } from 'redisClient/redis';
import { createApp } from 'app/app';
import { logger } from 'shared/logger/logger';

config();

const PORT = process.env.PORT || 4000;

const start = async () => {
    const db = createPrismaClient(process.env.DATABASE_URL!);
    const redis = createRedisClient(process.env.REDIS_URL!);
    await db.$connect();
    logger.log('DB connected');

    await redis.connect();
    logger.log('Redis connected');

    const appDeps = {
        db,
        redis,
    };

    const app = createApp(appDeps);
    const server = app.listen(PORT, () => {
        logger.log(`Server listening on port ${PORT}`);
        logger.log('http://localhost:4000');
    });

    const shutDown = async (signal: string) => {
        logger.log(signal + '. Shutting down...');

        server.close(async () => {
            logger.log('HTTP server closed');

            try {
                await db.$disconnect();
                logger.log('DB disconnected');

                await redis.quit();
                logger.log('Redis disconnected');

                logger.log('Server shut down.');
                process.exit(0);
            } catch (error) {
                logger.error('Error shutting down server ', error);
                process.exit(1);
            }
        });
    };
    process.on('SIGINT', () => shutDown('SIGINT'));
    process.on('SIGTERM', () => shutDown('SIGTERM'));
};

start().catch((error) => {
    logger.error('Server did not start', error);
    process.exit(1);
});
