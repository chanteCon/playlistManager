import { PrismaClient, Prisma } from '@prisma/client';

export const createTransactionRunner = (db: PrismaClient) => {
    return {
        run: async <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
            return db.$transaction(async (tx) => {
                return fn(tx);
            });
        },
    };
};
