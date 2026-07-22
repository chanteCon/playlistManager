import {
    User,
    PublicUser,
    CreateUserParams,
    UserUpdatableInput,
    UserSelectParams,
} from 'features/user/types';
import { PrismaClient, Prisma } from '@prisma/client';
import { RedisClientType } from 'redis';
import { PrismaClientTx } from 'database/prisma/dbType';

type UserRepoDeps = { db: PrismaClient; redis?: RedisClientType };
export type UserRepo = ReturnType<typeof createUserRepo>;

const publicUserSelect = { id: true, username: true };

export const createUserRepo = ({ db }: UserRepoDeps) => {
    const create = async ({ data }: CreateUserParams): Promise<User> => {
        return await db.user.create({ data });
    };

    const remove = async (id: string): Promise<PublicUser> => {
        return await db.user.delete({ where: { id }, select: publicUserSelect });
    };

    type UpdateUserParamsPublic = {
        where: Prisma.UserWhereUniqueInput;
        data: UserUpdatableInput;
        select?: UserSelectParams;
    };
    const updateUserPublic = async ({
        where,
        data,
        select,
    }: UpdateUserParamsPublic): Promise<PublicUser> => {
        return await db.user.update({ where, data, select: { ...select, ...publicUserSelect } });
    };

    type UpdateUserParamsSensitive = {
        where: Prisma.UserWhereUniqueInput;
        data: Pick<Prisma.UserUpdateInput, 'password' | 'verified' | 'email'>;
        select?: UserSelectParams;
        tx?: PrismaClientTx;
    };
    const updateUserSensitive = async ({
        where,
        data,
        select,
        tx = db,
    }: UpdateUserParamsSensitive) => {
        return await tx.user.update({ where, data, select });
    };

    type FindUserParams = { id: string; select?: UserSelectParams };

    const findUserInternalById = async ({ id, select }: FindUserParams): Promise<User | null> => {
        return db.user.findUnique({
            where: { id },
            select,
        });
    };

    const findUserPublicById = async ({
        id,
        select,
    }: FindUserParams): Promise<PublicUser | null> => {
        return db.user.findUnique({
            where: { id },
            select: { ...publicUserSelect, ...select },
        });
    };

    type FilterUserParams = { filter: Prisma.UserWhereInput; select?: UserSelectParams };
    const findUserInternalByFilter = async ({
        filter,
        select,
    }: FilterUserParams): Promise<User | null> => {
        return db.user.findFirst({
            where: filter,
            select,
        });
    };

    const findUserPublicByFilter = async ({
        filter,
        select,
    }: FilterUserParams): Promise<PublicUser | null> => {
        return db.user.findFirst({
            where: filter,
            select: { ...select, ...publicUserSelect },
        });
    };

    type FindUserByEmailParams = { email: string; select?: UserSelectParams };
    const findInternalUserByEmail = ({ email, select }: FindUserByEmailParams) =>
        findUserInternalByFilter({ filter: { email }, select });

    const findUserPublicByEmail = ({ email, select }: FindUserByEmailParams) =>
        findUserPublicByFilter({ filter: { email }, select });

    const findAll = async (options?: Prisma.UserWhereInput): Promise<PublicUser[]> => {
        return await db.user.findMany({ where: options, select: publicUserSelect });
    };

    return {
        create,
        remove,
        findAll,
        findUserInternalById,
        findUserPublicById,
        findInternalUserByEmail,
        findUserPublicByEmail,
        updateUserPublic,
        findUserPublicByFilter,
        findUserInternalByFilter,
        updateUserSensitive,
    };
};
