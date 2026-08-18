import { NotFoundError } from 'shared/errors/errors';
import {
    CreateUserParams,
    PublicUser,
    User,
    UpdateUserParams,
    UpdatePasswordParams,
    UserSelectParams,
    UserSearchableParams,
} from './types';
import { UserRepo } from './repos/userRepo';
import { handleNotFoundError, handleUniqueConstraintError } from 'database/prisma/repoError';
import { CodeService } from 'shared/userCodes/codeService';
import { TokenService } from 'features/auth/services/tokenService';
import { PrismaClientTx, TxRunner } from 'database/prisma/dbType';
import { logger } from 'shared/logger/logger';

type UserServiceDeps = {
    userRepo: UserRepo;
    codeService: CodeService;
    tokenService: TokenService;
    txRunner: TxRunner;
};

export type UserService = ReturnType<typeof createUserService>;

export const createUserService = ({
    userRepo,
    codeService,
    tokenService,
    txRunner,
}: UserServiceDeps) => {
    const create = async ({ data }: CreateUserParams): Promise<User> => {
        try {
            const user = await userRepo.create({ data });
            return user;
        } catch (error) {
            handleUniqueConstraintError(error);
            throw error;
        }
    };

    const verify = async (id: string) => {
        try {
            await userRepo.updateUserSensitive({ where: { id }, data: { verified: true } });
        } catch (error) {
            handleNotFoundError(error, 'User not found');
            throw error;
        }
    };

    const findVerifiedById = async (id: string): Promise<PublicUser> => {
        const verifiedUser = await userRepo.findUserPublicByFilter({
            filter: { id, verified: true },
        });
        if (!verifiedUser) {
            throw new NotFoundError('User not found');
        }
        return verifiedUser;
    };

    const findVerifiedByEmail = async (email: string): Promise<PublicUser> => {
        const verifiedUser = await userRepo.findUserPublicByFilter({
            filter: { email, verified: true },
        });
        if (!verifiedUser) {
            throw new NotFoundError('User not found');
        }
        return verifiedUser;
    };

    const update = async ({ id, data }: UpdateUserParams): Promise<PublicUser> => {
        try {
            return await userRepo.updateUserPublic({ where: { id }, data });
        } catch (error) {
            handleUniqueConstraintError(error);
            handleNotFoundError(error, 'User not found');
            throw error;
        }
    };

    const updatePassword = async ({
        id,
        passwordHash,
        tx,
    }: UpdatePasswordParams): Promise<PublicUser> => {
        try {
            return await userRepo.updateUserSensitive({
                where: { id },
                data: { password: passwordHash },
                tx,
            });
        } catch (error) {
            handleNotFoundError(error, 'User not found');
            throw error;
        }
    };

    const updateEmail = async ({ id, email }: { id: string; email: string }): Promise<void> => {
        try {
            await txRunner.run(async (tx: PrismaClientTx) => {
                const user = await userRepo.updateUserSensitive({
                    where: { id, verified: true },
                    data: { email, verified: false },
                    tx,
                });
                await codeService.issueCodeForUser({
                    data: { user, codeType: 'VERIFICATION' },
                    tx,
                });
                await tokenService.revokeAllForUser(id, tx);
            });
        } catch (error) {
            handleUniqueConstraintError(error);
            handleNotFoundError(error, 'User not found');
            throw error;
        }
    };

    const remove = async (id: string): Promise<string> => {
        try {
            const user = await userRepo.remove(id);
            await codeService.removeAllForUser(id).catch(() => {
                logger.warn('Failed to remove user codes from Redis', { userId: id });
            });
            return user.id;
        } catch (error) {
            handleNotFoundError(error, 'User not found');
            throw error;
        }
    };

    const findAuthUserById = async (id: string): Promise<PublicUser> => {
        const user = await userRepo.findUserPublicById({ id, select: { email: true } });
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    };

    const findInternalUserByEmail = async ({
        email,
        options,
    }: {
        email: string;
        options?: UserSelectParams;
    }): Promise<User> => {
        const user = await userRepo.findInternalUserByEmail({ email, select: options });
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    };

    const findAll = async (options: UserSearchableParams = { verified: true }) => {
        return await userRepo.findAll(options);
    };

    return {
        create,
        update,
        remove,
        findAuthUserById,
        findInternalUserByEmail,
        findAll,
        updatePassword,
        verify,
        findVerifiedById,
        updateEmail,
        findVerifiedByEmail,
    };
};
