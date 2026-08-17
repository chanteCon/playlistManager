import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { createAuthService } from './services/authService';
import { createAuthController } from './authController';
import { createAuthRoutes } from './authRoutes';
import { UserService } from 'features/user/userService';
import { CodeService } from 'shared/userCodes/codeService';
import { RequestHandler } from 'express';
import { TokenService } from './services/tokenService';
import { TxRunner } from 'database/prisma/dbType';

type AuthFeatureDeps = {
    db: PrismaClient;
    redis: RedisClientType;
    services: {
        userService: UserService;
        codeService: CodeService;
        tokenService: TokenService;
    };
    authMiddleware: RequestHandler;
    verificationMiddleware: RequestHandler;
    txRunner: TxRunner;
};

export const createAuthFeature = ({
    services,
    authMiddleware,
    verificationMiddleware,
    txRunner,
}: AuthFeatureDeps) => {
    const authService = createAuthService({ services: { ...services }, txRunner });
    const authController = createAuthController({
        services: { authService, tokenService: services.tokenService },
    });

    return { routes: createAuthRoutes({ authController, authMiddleware, verificationMiddleware }) };
};
