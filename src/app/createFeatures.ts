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
import { createPlaylistFeature } from 'features/playlist';
import { createVerificationMiddleware } from 'middleware/verificationMiddleware';
import { createTokenRepo } from 'features/auth/repos/refreshTokenRepo';
import { createTokenService } from 'features/auth/services/tokenService';

type FeatureDeps = {
    db: PrismaClient;
    redis: RedisClientType;
    authMiddleware: RequestHandler;
};
export const createFeatures = ({ db, redis, authMiddleware }: FeatureDeps) => {
    const { codeService } = createCodeModule(redis);
    const userRepo = createUserRepo({ db, redis });
    const refreshTokenRepo = createTokenRepo({ db, redis });

    // services
    const tokenService = createTokenService({
        refreshTokenRepo,
    });
    const txRunner = createTransactionRunner(db);

    const userService = createUserService({ userRepo, codeService, tokenService, txRunner });
    const verificationMiddleware = createVerificationMiddleware(userService);

    const userFeature = createUserFeature({
        userService: userService,
        authMiddleware,
    });
    const authFeature = createAuthFeature({
        db,
        redis,
        services: { userService, codeService, tokenService },
        authMiddleware,
        verificationMiddleware,
        txRunner,
    });
    const playlistFeature = createPlaylistFeature({ db, authMiddleware });

    return { userFeature, authFeature, playlistFeature };
};

export const createCodeModule = (redis: RedisClientType) => {
    const codeRepo = createCodeRepo({ redis });
    const emailService = createEmailService();
    const codeService = createCodeService({ codeRepo, emailService });
    return { codeService };
};
