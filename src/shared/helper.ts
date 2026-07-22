import { Response } from 'express';

export const canSendResponse = (res: Response) => {
    return !res.headersSent;
};
