import { RequestHandler } from 'express';
import { createUserController } from './userController';
import { createUserRoutes } from './userRoutes';
import { UserService } from './userService';

type UserFeatureDeps = {
    userService: UserService;
    authUserLimiter: RequestHandler;
};

export const createUserFeature = ({ userService, authUserLimiter }: UserFeatureDeps) => {
    const userController = createUserController(userService);
    return {
        routes: createUserRoutes({ userController, authUserLimiter }),
        userService,
    };
};
