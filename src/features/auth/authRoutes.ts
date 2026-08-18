import { RequestHandler, Router } from 'express';
import { validate } from 'middleware/validationMiddleware';
import {
    createAccountSchema,
    loginSchema,
    codeReqSchema,
    passwordResetSchema,
    verificationSchema,
} from './schemas';
import { AuthController } from './authController';
import { authMiddleware } from 'features/video/authMiddleware';

type AuthRoutesDeps = {
    authController: AuthController;
    verificationMiddleware: RequestHandler;
    authUserLimiter: RequestHandler;
};

export const createAuthRoutes = ({
    authController,
    verificationMiddleware,
    authUserLimiter,
}: AuthRoutesDeps) => {
    const router = Router();

    router.post('/register', validate(createAccountSchema), authController.register);

    router.patch('/verify', validate(verificationSchema), authController.verify);

    router.post('/login', validate(loginSchema), verificationMiddleware, authController.startLogin);

    router.post('/login/mfa', validate(verificationSchema), authController.loginMfa);

    router.post('/refresh', authController.rotateTokens);

    router.post('/logout', authMiddleware, authUserLimiter, authController.logout);

    router.post(
        '/verification-code-request',
        validate(codeReqSchema),
        authController.requestVerificationCode,
    );

    router.post(
        '/password-reset-request',
        validate(codeReqSchema),
        authController.requestPasswordReset,
    );

    router.patch('/password-reset', validate(passwordResetSchema), authController.resetPassword);

    return router;
};
