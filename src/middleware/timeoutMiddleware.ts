import { Request, Response, NextFunction } from 'express';
import { canSendResponse } from 'shared/helper';

export const timeout = (ms: number) => {
    return (_req: Request, res: Response, next: NextFunction) => {
        const timer = setTimeout(() => {
            if (canSendResponse(res)) {
                res.status(503).json({ message: 'Request has timed out', success: false });
            }
        }, ms);

        res.on('finish', () => {
            clearTimeout(timer);
        });

        res.on('close', () => {
            clearTimeout(timer);
        });

        next();
    };
};
