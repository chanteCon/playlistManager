import { z } from 'zod';
import { Request } from 'express';
import { createAccountSchema, loginSchema, passwordResetSchema } from './schemas';

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CodeType = 'PASSWORD_RESET' | 'VERIFICATION' | 'LOGIN';
export type EmailCodeInput = { email: string; codeType: CodeType };

export type Tokens = { accessToken: string; refreshToken: string };

export type ResetPasswordInput = z.infer<typeof passwordResetSchema>;

export type ConsumedRefreshToken = {
    expiresAt: Date;
    userId: string;
    deviceId: string;
    userVerified: boolean;
    isReuse: boolean;
};

export type AuthUser = { id: string; deviceId?: string };
export interface AuthRequest<
    Params = any,
    ResBody = any,
    ReqBody = any,
    ReqQuery = any,
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
    user?: AuthUser;
}

export type UserCode = {
    id: string;
    userId: string;
    codeHash: string;
    codeType: 'VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN';
    expiresAt: Date;
};
