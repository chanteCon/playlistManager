import { Request, Response } from 'express';

import { UnauthorisedError } from 'shared/errors/errors';
import { authConfig } from 'config/auth.config';
import { CreateAccountInput, AuthRequest, LoginInput, ResetPasswordInput } from './types';
import { TokenService } from './services/tokenService';
import { AuthService } from './services/authService';
import { canSendResponse } from 'shared/helper';

type AuthControllerDeps = {
    services: {
        authService: AuthService;
        tokenService: TokenService;
    };
};

export type AuthController = ReturnType<typeof createAuthController>;

export const createAuthController = ({ services }: AuthControllerDeps) => {
    const { authService, tokenService } = services;
    const COOKIE_EXPIRY_MS = parseInt(authConfig.refreshTokenExp) * 1000;

    const register = async (req: Request<any, any, CreateAccountInput>, res: Response) => {
        await authService.register(req.body);
        res.locals.message =
            'A code has been sent to the provided email address. Please verify email to continue.';
        return res.status(201).json({});
    };

    const verify = async (req: Request<any, any, { code: string }>, res: Response) => {
        await authService.verifyUser(req.body.code);
        res.locals.message = 'Email successfully verified, please login';
        return res.status(200).json({});
    };

    const requestVerificationCode = async (
        req: Request<any, any, { email: string }>,
        res: Response,
    ) => {
        await authService.issueCodeForEmail({ email: req.body.email, codeType: 'VERIFICATION' });
        res.locals.message = 'If email is valid you will receive a code';
        return res.status(200).json({});
    };

    const startLogin = async (req: Request<any, any, LoginInput>, res: Response) => {
        const { email, password } = req.body;
        await authService.startLogin({ email, password });
        res.locals.message = 'If email is valid you will receive a login code';
        return res.status(200).json({});
    };

    const loginMfa = async (req: Request<any, any, { code: string }>, res: Response) => {
        const existingDeviceId = req.cookies?.deviceId;
        const { accessToken, refreshToken, deviceId } = await authService.loginMfa({
            code: req.body.code,
            existingDeviceId,
        });
        setCookie(res, deviceId!, 'deviceId');
        return sendAuthTokens(res, accessToken, refreshToken);
    };

    const rotateTokens = async (req: Request, res: Response) => {
        const oldToken = req.cookies?.refreshToken;
        if (!oldToken) {
            throw new UnauthorisedError('Unauthorized');
        }
        clearSessionCookie(res, 'refreshToken');
        const { accessToken, refreshToken } = await tokenService.rotateTokens(oldToken);
        return sendAuthTokens(res, accessToken, refreshToken);
    };

    const logout = async (req: AuthRequest, res: Response) => {
        clearSessionCookie(res, 'refreshToken');
        await authService.logout(req.user!);
        res.locals.message = 'Successfully logged out.';
        return res.status(200).json({});
    };

    const requestPasswordReset = async (
        req: Request<any, any, { email: string }>,
        res: Response,
    ) => {
        await authService.issueCodeForEmail({ email: req.body.email, codeType: 'PASSWORD_RESET' });
        res.locals.message = 'If email is valid you will receive a code';
        return res.status(200).json({});
    };

    const resetPassword = async (req: Request<any, any, ResetPasswordInput>, res: Response) => {
        await authService.resetPassword(req.body);
        clearSessionCookie(res, 'refreshToken');
        res.locals.message = 'Password successfully reset';
        return res.status(200).json({});
    };

    const clearSessionCookie = (res: Response, name: string, path = '/api/auth') => {
        if (canSendResponse(res)) {
            res.clearCookie(name, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                path,
            });
        }
    };

    const setCookie = (res: Response, value: string, name: string, path = '/') => {
        if (canSendResponse(res)) {
            res.cookie(name, value, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                path,
                maxAge: COOKIE_EXPIRY_MS,
            });
        }
    };

    const sendAuthTokens = (
        res: Response,
        accessToken: string,
        refreshToken: string,
        status: number = 200,
    ) => {
        setCookie(res, refreshToken, 'refreshToken', '/api/auth');
        res.status(status).json({ accessToken });
    };

    return {
        register,
        startLogin,
        loginMfa,
        logout,
        rotateTokens,
        requestPasswordReset,
        requestVerificationCode,
        resetPassword,
        verify,
    };
};
