import { PrismaClient } from '@prisma/client';
import { createAuthFeature } from '../features/auth';
import { createUserFeature } from '../features/user';
import { RedisClientType } from 'redis';
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
import { createRateLimiter } from 'middleware/rateLimitMiddleware';

type FeatureDeps = {
    db: PrismaClient;
    redis: RedisClientType;
};
export const createFeatures = ({ db, redis }: FeatureDeps) => {
    const authUserLimiter = createRateLimiter(redis, { type: 'USER', max: 300 });
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
        userService,
        authUserLimiter,
    });
    const authFeature = createAuthFeature({
        db,
        redis,
        services: { userService, codeService, tokenService },
        middleware: { authUserLimiter, verificationMiddleware },
        txRunner,
    });
    const playlistFeature = createPlaylistFeature({ db, authUserLimiter });

    return { userFeature, authFeature, playlistFeature };
};

export const createCodeModule = (redis: RedisClientType) => {
    const codeRepo = createCodeRepo({ redis });
    const emailService = createEmailService();
    const codeService = createCodeService({ codeRepo, emailService });
    return { codeService };
};
