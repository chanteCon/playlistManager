import { PrismaClient, Prisma } from '@prisma/client';

export const prismaNotFoundError = new Prisma.PrismaClientKnownRequestError(`User not found`, {
    code: 'P2025',
    clientVersion: '4.15.0',
});

export const prismaUniqueConstraintError = new Prisma.PrismaClientKnownRequestError(`email`, {
    code: 'P2002',
    clientVersion: '4.15.0',
    meta: { modelName: 'User' },
});

export const truncateDbTables = async (db: PrismaClient) => {
    const tables: Array<{ tablename: string }> =
        await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public';`;

    for (const { tablename } of tables) {
        await db.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
};
