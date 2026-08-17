import type { Response, Request, NextFunction } from 'express';
import { LoginInput } from 'features/auth/types';
import { UserService } from 'features/user/userService';
import { ForbiddenError, NotFoundError } from 'shared/errors/errors';

export const createVerificationMiddleware = (userService: UserService) => {
    return async (req: Request<any, any, LoginInput>, res: Response, next: NextFunction) => {
        const { email } = req.body;

        try {
            await userService.findVerifiedByEmail(email);
            return next();
        } catch (error) {
            if (error instanceof NotFoundError) {
                return next(new ForbiddenError('Email not verified'));
            }

            return next(error);
        }
    };
};
