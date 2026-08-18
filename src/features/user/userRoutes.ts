import { RequestHandler, Router } from 'express';
import { validate } from 'middleware/validationMiddleware';
import { updateUserSchema, updateEmailSchema } from './schemas';
import { UserController } from './userController';
import { authMiddleware } from 'features/video/authMiddleware';

type UserRoutesDeps = {
    userController: UserController;
    authUserLimiter: RequestHandler;
};

export const createUserRoutes = ({ userController, authUserLimiter }: UserRoutesDeps) => {
    const router = Router();
    router.use(authMiddleware);
    router.use(authUserLimiter);

    router.get('/me', userController.getAuthenticatedUser);

    router.patch('/me', validate(updateUserSchema), userController.updateAuthenticatedUser);

    router.delete('/me', userController.deleteAuthenticatedUser);

    router.patch('/update-email', validate(updateEmailSchema), userController.updateEmail);

    return router;
};
