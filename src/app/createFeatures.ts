import { PrismaClient } from '@prisma/client';
import { createAuthFeature } from '../features/auth';
import { createUserFeature } from '../features/user';
import { RedisClientType } from 'redis';
import { RequestHandler } from 'express';
import { createUserRepo } from 'features/user/repos/userRepo';
import { createUserService } from 'features/user/userService';
import { createCodeService } from 'shared/userCodes/codeService';
import { createCodeRepo } from 'shared/userCodes/codeRepo';
import { createEmailService } from 'shared/email/emailService';
import { createTransactionRunner } from 'database/transactionRunner';

type FeatureDeps = {
    db: PrismaClient;
    redis: RedisClientType;
    authMiddleware: RequestHandler;
};
export const createFeatures = ({ db, redis, authMiddleware }: FeatureDeps) => {
    const { codeService } = createCodeModule(redis);
    const userRepo = createUserRepo({ db, redis });
    const userService = createUserService({ userRepo, codeService });
    const userFeature = createUserFeature({
        userService: userService,
        authMiddleware,
    });
    const txRunner = createTransactionRunner(db);
    const authFeature = createAuthFeature({
        db,
        redis,
        services: { userService, codeService },
        authMiddleware,
        txRunner,
    });
    return { userFeature, authFeature };
};

export const createCodeModule = (redis: RedisClientType) => {
    const codeRepo = createCodeRepo({ redis });
    const emailService = createEmailService();
    const codeService = createCodeService({ codeRepo, emailService });
    return { codeService };
};
