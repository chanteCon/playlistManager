import { createApp } from 'app/app';
import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { Application } from 'express';
import { createTestInfrastructure } from './infrastructure';

export type TestAppEnv = {
    db: PrismaClient;
    redis: RedisClientType;
    app: Application;
    teardown: () => Promise<void>;
};

export const createTestApp = async (): Promise<TestAppEnv> => {
    const { redis, db, teardown } = await createTestInfrastructure();
    const app = createApp({ db, redis });
    return { db, redis, app, teardown };
};
