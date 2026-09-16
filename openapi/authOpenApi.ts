import * as authSchemas from '../src/features/auth/schemas';
import { ZodOpenApiComponentsObject, ZodOpenApiSecuritySchemeObject } from 'zod-openapi';
import { errorResponse, successResponse } from './commonSchemas';
import z from 'zod';
const email = 'user@example.com';
const username = 'User_name123';
const password = 'Aa1!xyz';
const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature';

export const authHeader: Record<string, ZodOpenApiSecuritySchemeObject> = {
    BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
            'Access token in Authorization header, e.g., "Bearer <token>", expires in 30 minutes',
    },
};

const components: ZodOpenApiComponentsObject = {
    securitySchemes: authHeader,
};

const paths = {
    '/api/auth/register': {
        post: {
            summary: 'Register a new user',
            description:
                'Creates a new user account and sends a verification code to user. Verify email at api/auth/verify.',
            tags: ['Auth'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: authSchemas.createAccountSchema,
                        example: {
                            email,
                            password,
                            username,
                        },
                    },
                },
            },
            responses: {
                201: successResponse({
                    message:
                        'A code has been sent to the provided email address. Please verify email to continue.',
                }),
                400: errorResponse({
                    message: 'Invalid input',
                    errors: {
                        email: ['Invalid email address'],
                        username: ['Username must be at least 5 characters'],
                        password: [
                            'Password must contain uppercase, lowercase, number, and symbol, and no invalid characters',
                        ],
                    },
                }),
                409: errorResponse({
                    message: 'Conflict',
                    examples: {
                        emailAlreadyInUse: {
                            summary: 'Email already in use',
                            value: {
                                success: false,
                                data: null,
                                message: 'Email already in use',
                                errors: {
                                    email: ['Email already in use'],
                                },
                            },
                        },
                        usernameAlreadyInUse: {
                            summary: 'Username already in use',
                            value: {
                                success: false,
                                data: null,
                                message: 'Username already in use',
                                errors: {
                                    username: ['Username already in use'],
                                },
                            },
                        },
                    },
                }),
            },
        },
    },
    '/api/auth/verify': {
        patch: {
            summary: 'User verifies email address',
            tags: ['Auth'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: authSchemas.verificationSchema,
                        example: {
                            code: '123',
                        },
                    },
                },
            },
            responses: {
                200: successResponse({
                    dataSchema: z.object({ accessToken: authSchemas.accessTokenField }),
                    data: {
                        accessToken,
                    },
                    headers: {
                        'Set-Cookie': {
                            description: 'Refresh token cookie, expires in 7 days',
                            schema: { type: 'string' },
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                    errors: {
                        code: ['Too small: expected string to have >=6 characters'],
                    },
                }),
                401: errorResponse({
                    message: 'Could not verify verification code',
                    errors: {
                        code: ['Invalid or expired verification code'],
                    },
                }),
            },
        },
    },
    '/api/auth/login': {
        post: {
            summary: 'User login',
            description: 'Sends a verification code for login to user email',
            tags: ['Auth'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: authSchemas.loginSchema,
                        example: { email, password },
                    },
                },
            },
            responses: {
                200: successResponse({
                    message: 'If email is valid you will receive a login code',
                }),
                400: errorResponse({
                    message: 'Invalid input',
                    errors: {
                        email: ['Invalid email address'],
                        password: ['Password must be a string'],
                    },
                }),
                401: errorResponse({ message: 'Incorrect email or password' }),
            },
        },
    },
    '/api/auth/login/MFA': {
        post: {
            summary: 'User login MFA',
            description: 'User can enter log in code',
            tags: ['Auth'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: authSchemas.verificationSchema,
                        example: { code: '123' },
                    },
                },
            },
            responses: {
                200: successResponse({
                    dataSchema: z.object({ accessToken: authSchemas.accessTokenField }),
                    data: {
                        accessToken,
                    },
                    headers: {
                        'Set-Cookie': {
                            description: 'Refresh token cookie, expires in 7 days',
                            schema: { type: 'string' },
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                    errors: {
                        code: ['Too small: expected string to have >=6 characters'],
                    },
                }),
                401: errorResponse({
                    message: 'Could not verify code',
                    errors: { code: ['Invalid or expired login code'] },
                }),
            },
        },
    },
    '/api/auth/refresh': {
        post: {
            summary: 'Refresh access token',
            description: `Issues new access token and refresh token cookie. \
            Refresh token cookie must be included in the request. User must be\
             verified. Generic 401 error if token invalid or user not verified.`,
            tags: ['Auth'],
            responses: {
                200: successResponse({
                    dataSchema: z.object({ accessToken: authSchemas.accessTokenField }),
                    data: {
                        accessToken,
                    },
                    headers: {
                        'Set-Cookie': {
                            description: 'Refresh token cookie, expires in 7 days',
                            schema: { type: 'string' },
                        },
                    },
                }),
                401: errorResponse({ message: 'Invalid token' }),
            },
        },
    },
    '/api/auth/logout': {
        post: {
            summary: 'User logout',
            description: 'Clears refresh cookie on logout',
            tags: ['Auth'],
            security: [{ BearerAuth: [] }],
            responses: {
                201: successResponse({
                    message: 'Successfully logged out.',
                }),
                401: errorResponse({ message: 'Unauthorized' }),
            },
        },
    },
    '/api/auth/verification-code-request': {
        post: {
            summary: 'User can request new verification code for their email address',
            description:
                'Issues a code to verify email and emails to user. \
                 Verify email with this code at /api/auth/verify.',
            tags: ['Auth'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: authSchemas.codeReqSchema,
                        example: {
                            email,
                        },
                    },
                },
            },
            responses: {
                200: successResponse({
                    message: 'If email is valid you will receive a code',
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                    errors: { email: ['Invalid email address'] },
                }),
            },
        },
    },
    '/api/auth/password-reset-request': {
        post: {
            summary: 'User request password reset',
            description: `Issues a code to reset password and emails to user. 
                Reset password with this code at /api/auth/password-reset.`,
            tags: ['Auth'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: authSchemas.codeReqSchema,
                        example: {
                            email,
                        },
                    },
                },
            },
            responses: {
                200: successResponse({
                    message: 'If email is valid you will receive a code',
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                    errors: { email: ['Invalid email address'] },
                }),
            },
        },
    },
    '/api/auth/password-reset': {
        patch: {
            summary: 'User reset password',
            tags: ['Auth'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: authSchemas.passwordResetSchema,
                        example: {
                            code: '123',
                            password: 'newPassword123!$',
                        },
                    },
                },
            },
            responses: {
                200: successResponse({ message: 'Password successfully reset' }),
                400: errorResponse({
                    message: 'Invalid input',
                    errors: {
                        password: [
                            'Password must contain uppercase, lowercase, number, and symbol, and no invalid characters',
                        ],
                        code: ['Too small: expected string to have >=6 characters'],
                    },
                }),
                401: errorResponse({
                    message: 'Could not verify code',
                    errors: { code: ['Invalid or expired login code'] },
                }),
            },
        },
    },
};
export const authApiPaths = {
    openapi: '3.1.0',
    info: { title: 'Auth API', version: '1.0.0' },
    components,
    paths,
};
