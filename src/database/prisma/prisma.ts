import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { logger } from 'shared/logger/logger';

export const createPrismaClient = (dbUrl: string): PrismaClient => {
    try {
        return new PrismaClient({ datasources: { db: { url: dbUrl } } });
    } catch (error) {
        logger.log(error);
        throw error;
    }
};
