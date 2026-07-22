import { createTransactionRunner } from 'database/transactionRunner';
import { Prisma } from '@prisma/client';

export type PrismaClientTx = Prisma.TransactionClient;

export type TxRunner = ReturnType<typeof createTransactionRunner>;
