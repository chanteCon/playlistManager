import { z } from 'zod';
import { User as PrismaUser, Prisma } from '@prisma/client';
import { updateUserSchema } from './schemas';
import { PrismaClientTx } from 'database/prisma/dbType';
import { createAccountSchema } from 'features/auth/schemas';

export type User = PrismaUser;
export type CreateUserParams = {
    data: z.infer<typeof createAccountSchema>;
    tx?: PrismaClientTx;
};
export type PublicUser = Omit<User, 'password' | 'createdAt' | 'updatedAt' | 'verified' | 'email'>;
export type UserUpdatableInput = z.infer<typeof updateUserSchema>;

export type UpdateUserParams = {
    id: string;
    data: UserUpdatableInput;
};
export type UpdatePasswordParams = {
    id: string;
    passwordHash: string;
    tx?: PrismaClientTx;
};

export type UserSelectParams = Prisma.UserSelect;

export type UserSearchableParams = Omit<Prisma.UserWhereInput, 'passwordHash'>;
