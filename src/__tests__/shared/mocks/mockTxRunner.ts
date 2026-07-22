import { TxRunner } from 'database/prisma/dbType';

export const fakeTx = {} as any;

export const mockTxRunner: TxRunner = {
    run: jest.fn(async <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
        return fn(fakeTx);
    }),
};
