import { z } from 'zod';

export const emailField = z.email().trim().toLowerCase().meta({
    description: 'User email address, must be valid and unique',
    example: 'user@example.com',
});

export const usernameField = z
    .string()
    .trim()
    .min(5)
    .max(30)
    .regex(
        /^[a-zA-Z0-9._-]+$/,
        'Username can only contain letters, numbers, dots, underscores, and hyphens',
    )
    .transform((u) => u.toLowerCase())
    .meta({
        description:
            'Username must be unique and between 5 and 30 characters. Can only contain letters, numbers, dots, underscores, and hyphens',
        example: 'User_name123',
    });

export const updateUserSchema = z
    .object({
        username: usernameField,
    })
    .strip();

export const updateEmailSchema = z
    .object({
        email: emailField,
    })
    .strip();

const userIdField = z.uuid().meta({
    description: 'The unique ID of the user',
    example: '00000000-0000-0000-0000-000000000000',
});

export const userIdSchema = z
    .object({
        id: userIdField,
    })
    .strip();

export const publicUserSchema = z.object({
    user: z.object({
        id: userIdField,
        username: usernameField,
    }),
});

export const userDataSchema = publicUserSchema.extend({
    user: publicUserSchema.shape.user.extend({ email: emailField }),
});
