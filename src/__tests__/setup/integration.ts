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
import { Infrastructure } from './infrastructure';
import { createVideoRepo } from 'features/video/repos/videoRepo';
import { PrismaClient } from '@prisma/client';
import { createVideoService } from 'features/video/services/videoService';
import { VideoMetadataService } from 'features/video/services/videoMetadataService';

const createCodeServiceFixture = (redis: RedisClientType, emailService: EmailService) => {
    const codeRepo = createCodeRepo({ redis });
    const codeService = createCodeService({ codeRepo, emailService });
    return codeService;
};

type FixtureDeps = Infrastructure & { emailService: EmailService };

export const createUserServiceFixture = ({ db, redis, emailService }: FixtureDeps) => {
    const codeService = createCodeServiceFixture(redis, emailService);
    const userRepo = createUserRepo({ db });
    return {
        userService: createUserService({ userRepo, codeService }),
        codeService,
    };
};

export const createAuthServiceFixture = ({ db, redis, emailService }: FixtureDeps) => {
    const codeService = createCodeServiceFixture(redis, emailService);
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

export const createVideoServiceFixture = ({
    db,
    videoMetadataService,
}: {
    db: PrismaClient;
    videoMetadataService: VideoMetadataService;
}) => {
    const videoRepo = createVideoRepo({ db });
    const videoService = createVideoService({ videoRepo, videoMetadataService });
    return { db, videoService };
};
