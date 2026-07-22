import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { createTokenRepo } from './repos/refreshTokenRepo';
import { createAuthService } from './services/authService';
import { createAuthController } from './authController';
import { createAuthRoutes } from './authRoutes';
import { UserService } from 'features/user/userService';
import { CodeService } from 'shared/userCodes/codeService';
import { RequestHandler } from 'express';
import { createTokenService } from './services/tokenService';
import { TxRunner } from 'database/prisma/dbType';

type AuthFeatureDeps = {
    db: PrismaClient;
    redis: RedisClientType;
    services: {
        userService: UserService;
        codeService: CodeService;
    };
    authMiddleware: RequestHandler;
    txRunner: TxRunner;
};

export const createAuthFeature = ({
    redis,
    db,
    services,
    authMiddleware,
    txRunner,
}: AuthFeatureDeps) => {
    const refreshTokenRepo = createTokenRepo({ db, redis });

    // services
    const tokenService = createTokenService({
        refreshTokenRepo,
    });
    const authService = createAuthService({ services: { tokenService, ...services }, txRunner });
    const authController = createAuthController({
        services: { authService, tokenService },
    });

    return { routes: createAuthRoutes({ authController, authMiddleware }) };
};
