import type { Response, NextFunction } from 'express';
import { AuthRequest } from 'features/auth/types';
import { UserService } from 'features/user/userService';
import { ForbiddenError, NotFoundError } from 'shared/errors/errors';

export const createVerificationMiddleware = (userService: UserService) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const { id } = req.user!;
        try {
            await userService.findVerifiedById(id);
        } catch (error) {
            if (error instanceof NotFoundError) {
                return next(new ForbiddenError('Email not verified'));
            }
            return next(error);
        }
        return next();
    };
};
