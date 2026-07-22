import { z } from 'zod';

import { usernameField, emailField } from '../../features/user/schemas';

export const passwordField = z
    .string()
    .min(6)
    .max(128)
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{6,}$/,
        'Password must contain uppercase, lowercase, number, and symbol, and no invalid characters',
    )
    .meta({
        description:
            'Password must be 6-128 characters with uppercase, lowercase, number, and symbol',
        example: 'Aa1!xyz',
    });

export const createAccountSchema = z
    .object({
        email: emailField,
        password: passwordField,
        username: usernameField,
    })
    .strip();

export const codeSchema = z.string().trim().length(6).meta({
    description: 'Six character verification code, expires in 5 minutes',
    example: '21923c',
});

export const verificationSchema = z.object({
    code: codeSchema,
});

export const loginSchema = z
    .object({
        email: emailField,
        password: z.string(),
    })
    .strip();

export const codeReqSchema = z
    .object({
        email: emailField,
    })
    .strip();

export const passwordResetSchema = z
    .object({
        code: codeSchema,
        password: passwordField,
    })
    .strip();

export const refreshTokenSchema = z
    .string()
    .meta({ description: 'Refresh token, expires in 7 days' });

export const accessTokenField = z.string().meta({
    description: 'Access token, expires in 30 minutes',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature',
});
