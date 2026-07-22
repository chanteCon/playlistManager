import { createUserController } from './userController';
import { createUserRoutes } from './userRoutes';
import { createVerificationMiddleware } from 'middleware/verificationMiddleware';
import { RequestHandler } from 'express';
import { UserService } from './userService';

type UserFeatureDeps = {
    userService: UserService;
    authMiddleware: RequestHandler;
};

export const createUserFeature = ({ userService, authMiddleware }: UserFeatureDeps) => {
    const userController = createUserController(userService);
    const verificationMiddleware = createVerificationMiddleware(userService);

    return {
        routes: createUserRoutes({ userController, verificationMiddleware, authMiddleware }),
        userService,
    };
};
