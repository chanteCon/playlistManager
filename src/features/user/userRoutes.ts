import { RequestHandler, Router } from 'express';
import { validate } from 'middleware/validationMiddleware';
import { updateUserSchema, userIdSchema, updateEmailSchema } from './schemas';
import { UserController } from './userController';

type UserRoutesDeps = {
    userController: UserController;
    authMiddleware: RequestHandler;
};

export const createUserRoutes = ({ userController, authMiddleware }: UserRoutesDeps) => {
    const router = Router();

    router.get('/me', authMiddleware, userController.getAuthenticatedUser);

    router.get('/:id', validate(userIdSchema, 'params'), userController.getUserById);

    router.get('/', userController.getAllUsers);

    router.patch(
        '/me',
        authMiddleware,
        validate(updateUserSchema),
        userController.updateAuthenticatedUser,
    );

    router.delete('/me', authMiddleware, userController.deleteAuthenticatedUser);

    router.patch(
        '/update-email',
        authMiddleware,
        validate(updateEmailSchema),
        userController.updateEmail,
    );

    return router;
};
