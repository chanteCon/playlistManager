import { createUserController } from './userController';
import { createUserRoutes } from './userRoutes';
import { RequestHandler } from 'express';
import { UserService } from './userService';

type UserFeatureDeps = {
    userService: UserService;
    authMiddleware: RequestHandler;
};

export const createUserFeature = ({ userService, authMiddleware }: UserFeatureDeps) => {
    const userController = createUserController(userService);

    return {
        routes: createUserRoutes({ userController, authMiddleware }),
        userService,
    };
};
