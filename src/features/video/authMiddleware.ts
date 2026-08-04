import type { Response, NextFunction, RequestHandler } from 'express';
import * as jwt from 'jsonwebtoken';
import { UnauthorisedError } from 'shared/errors/errors';
import { AuthRequest } from 'features/auth/types';
import { authConfig } from 'config/auth.config';

export const createAuthMiddlware = (): RequestHandler => {
    const verifyToken = (accessToken: string) => {
        try {
            return jwt.verify(accessToken, authConfig.accessTokenSecret) as jwt.JwtPayload;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new UnauthorisedError('Unauthorized');
            }
            throw error;
        }
    };

    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const { authorization } = req.headers;
        if (!authorization || !authorization.startsWith('Bearer ')) {
            throw new UnauthorisedError('Unauthorized');
        }
        const accessToken = authorization!.split(' ')[1];
        if (!accessToken) {
            throw new UnauthorisedError('Unauthorized');
        }
        const payload = verifyToken(accessToken);
        req.user = { id: payload.id, deviceId: payload.deviceId };
        next();
    };
};
