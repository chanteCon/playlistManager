import type { RequestHandler } from 'express';
import * as jwt from 'jsonwebtoken';
import { UnauthorisedError } from 'shared/errors/errors';
import { authConfig } from 'config/auth.config';
import { AuthRequest } from 'features/auth/types';

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

export const authMiddleware: RequestHandler = (req, _res, next) => {
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new UnauthorisedError('Unauthorized');
    }
    const accessToken = authorization.split(' ')[1];
    if (!accessToken) {
        throw new UnauthorisedError('Unauthorized');
    }
    const payload = verifyToken(accessToken);
    (req as AuthRequest).user = { id: payload.id, deviceId: payload.deviceId };
    next();
};
