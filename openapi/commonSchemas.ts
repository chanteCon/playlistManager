import z from 'zod';

export const SuccessResponse = z.object({
    success: z.literal(true),
    message: z.string().optional(),
    data: z.any(),
});

export const ErrorResponse = z.object({
    success: z.literal(false),
    message: z.string(),
    data: z.null(),
    errors: z
        .record(z.string(), z.array(z.string()))
        .nullable()
        .optional()
        .meta({
            example: {
                field: ['Validation error'],
            },
        }),
});

type SuccessParams = {
    data?: any;
    dataSchema?: any;
    message?: string;
    headers?: Record<string, any>;
};

function createSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T, message?: string) {
    return SuccessResponse.extend({
        data: dataSchema ? dataSchema : z.any().meta({ example: {} }),
        message:
            message !== undefined
                ? z.string().meta({ example: message })
                : z.string().nullable().meta({ example: null }),
    });
}

export function successResponse({ data, message, dataSchema, headers }: SuccessParams = {}) {
    const response: any = {
        description: message || 'Successful response',
        content: {
            'application/json': {
                schema: createSuccessSchema(dataSchema, message),
                example: {
                    success: true,
                    data: data || {},
                    message: message ?? null,
                },
            },
        },
    };
    if (headers) {
        response.headers = headers;
    }
    return response;
}

function createErrorSchema(message?: string) {
    return ErrorResponse.extend({
        message: message ? z.string().default(message) : ErrorResponse.shape.message,
    });
}

type ErrorParams = {
    message?: string;
    errors?: unknown;
    examples?: Record<
        string,
        {
            summary: string;
            value: {
                success: false;
                data: null;
                message: string;
                errors: unknown;
            };
        }
    >;
};

export function errorResponse({ message, errors, examples }: ErrorParams) {
    return {
        description: message || 'Error response',
        content: {
            'application/json': {
                schema: createErrorSchema(message),
                ...(examples
                    ? { examples }
                    : {
                          example: {
                              success: false,
                              data: null,
                              message,
                              errors: errors || null,
                          },
                      }),
            },
        },
    };
}

export const playlistVideoDTOSchema = z.object({
    id: z.uuid(),
    playlistId: z.uuid(),
    title: z.string(),
    description: z.string().optional(),
    thumbnail: z.string().optional(),
    url: z.string(),
    platform: z.string().nullable().optional(),
    platformId: z.string().nullable().optional(),
    render: z.boolean(),
    position: z.number(),
});

export const playlistDTOSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    videos: z.array(playlistVideoDTOSchema),
    coverUrl: z.string().nullable(),
    numVideos: z.number(),
    updatedAt: z.string(),
});

export const collectionSummaryDTOSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    numPlaylists: z.number(),
    coverUrl: z.string().nullable(),
});

export const searchResponseSchema = z.object({
    collections: z.array(collectionSummaryDTOSchema),
    playlists: z.array(playlistDTOSchema),
    videos: z.array(playlistVideoDTOSchema),
});
