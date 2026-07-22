import { createCodeRepo } from 'shared/userCodes/codeRepo';
import { createCodeService } from 'shared/userCodes/codeService';
import { createUserRepo } from 'features/user/repos/userRepo';
import { createUserService } from 'features/user/userService';
import { createAuthService } from 'features/auth/services/authService';
import { createTokenRepo } from 'features/auth/repos/refreshTokenRepo';
import { createTokenService } from 'features/auth/services/tokenService';
import { EmailService } from 'shared/email/emailService';
import { createTransactionRunner } from 'database/transactionRunner';
import { RedisClientType } from 'redis';
import { InfraStructure } from './infrastructure';

const createCodeServiceFixture = async (redis: RedisClientType, emailService: EmailService) => {
    const codeRepo = createCodeRepo({ redis });
    const codeService = createCodeService({ codeRepo, emailService });
    return codeService;
};

type FixtureDeps = InfraStructure & { emailService: EmailService };

export const createUserServiceFixture = async ({ db, redis, emailService }: FixtureDeps) => {
    const codeService = await createCodeServiceFixture(redis, emailService);
    const userRepo = createUserRepo({ db });
    return {
        userService: createUserService({ userRepo, codeService }),
        codeService,
    };
};

export const createAuthServiceFixture = async ({ db, redis, emailService }: FixtureDeps) => {
    const codeService = await createCodeServiceFixture(redis, emailService);
    const userRepo = createUserRepo({ db });
    const userService = createUserService({ userRepo, codeService });
    const refreshTokenRepo = createTokenRepo({ db });
    const tokenService = createTokenService({ refreshTokenRepo });
    const txRunner = createTransactionRunner(db);
    const authService = createAuthService({
        services: { userService, codeService, tokenService },
        txRunner,
    });
    return { authService, codeService, tokenService };
};
