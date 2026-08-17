import * as userSchemas from '../src/features/user/schemas';
import { ZodOpenApiComponentsObject, ZodOpenApiSecuritySchemeObject } from 'zod-openapi';
import { successResponse, errorResponse } from './commonSchemas';
import z from 'zod';
const email = 'user@example.com';
const username = 'User_name123';
const id = '00000000-0000-0000-0000-000000000000';
export const authHeader: Record<string, ZodOpenApiSecuritySchemeObject> = {
    BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token in Authorization header, e.g., "Bearer <token>"',
    },
};

const components: ZodOpenApiComponentsObject = {
    securitySchemes: authHeader,
};

const paths = {
    '/api/users/me': {
        get: {
            summary: 'Get authenticated user',
            tags: ['Users'],
            security: [{ BearerAuth: [] }],
            responses: {
                200: successResponse({
                    dataSchema: userSchemas.userDataSchema,
                    data: { user: { email, username, id } },
                }),
                401: errorResponse({ message: 'Unauthorized' }),
                404: errorResponse({ message: 'User not found' }),
            },
        },
        patch: {
            summary: 'User update information',
            tags: ['Users'],
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: userSchemas.updateUserSchema,
                        example: { username: 'newUsername123' },
                    },
                },
            },
            responses: {
                200: successResponse({
                    dataSchema: userSchemas.publicUserSchema,
                    data: { user: { username: 'newUsername123', id } },
                }),
                401: errorResponse({ message: 'Unauthorized' }),
                404: errorResponse({ message: 'User not found' }),
                400: errorResponse({
                    message: 'Invalid Input',
                    errors: `{ password: [ Unrecognized key(s) in object: password ] }`,
                }),
            },
        },
        delete: {
            summary: 'Delete authenticated user',
            tags: ['Users'],
            security: [{ BearerAuth: [] }],
            responses: {
                204: {
                    description: 'User deleted successfully',
                },
                401: errorResponse({ message: 'Unauthorized' }),
                404: errorResponse({ message: 'User not found' }),
            },
        },
    },
    '/api/users/{id}': {
        get: {
            summary: 'Get user by ID',
            tags: ['Users'],
            parameters: [
                {
                    name: 'id',
                    in: 'path' as const,
                    required: true,
                    schema: {
                        format: 'uuid',
                        example: '00000000-0000-0000-0000-000000000000',
                    },
                    description: 'User ID',
                },
            ],
            responses: {
                200: successResponse({
                    dataSchema: userSchemas.publicUserSchema,
                    data: { user: { username, id } },
                    message: 'User retrieved',
                }),
                404: errorResponse({ message: 'User not found' }),
                400: errorResponse({
                    message: 'Invalid Input',
                    errors: `{ id: [ Required] }`,
                }),
            },
        },
    },
    '/api/users': {
        get: {
            summary: 'Get all users',
            tags: ['Users'],
            responses: {
                200: successResponse({
                    dataSchema: z.array(userSchemas.publicUserSchema),
                    data: [{ user: { username, id } }],
                }),
            },
        },
    },

    '/api/users/update-email': {
        patch: {
            summary: 'User update email',
            description: `Sends new verification code to provided email address, 
            resets user to unverified state. Verify at /api/auth/verify`,
            tags: ['Users'],
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: userSchemas.updateEmailSchema,
                        example: {
                            email: 'new@email.com.au',
                        },
                    },
                },
            },
            responses: {
                200: successResponse({
                    message: 'A verification code has been sent, please check email',
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                    errors: 'Validation error messages',
                }),
                404: errorResponse({
                    message: 'User not found',
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                409: errorResponse({
                    message: 'Email already in use',
                }),
            },
        },
    },
};

export const userApiPaths = {
    openapi: '3.1.0',
    info: { title: 'Auth API', version: '1.0.0' },
    components,
    paths,
};
