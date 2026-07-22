import { Request, Response, NextFunction } from 'express';
import { canSendResponse } from 'shared/helper';

export function responseWrapper(req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
        if (!canSendResponse(res)) {
            return res;
        }
        if (data.success === false) {
            //error
            return originalJson(data);
        }
        const wrapped = {
            success: true,
            data: data,
            message: res.locals.message ?? null,
        };
        return originalJson(wrapped);
    };
    next();
}
