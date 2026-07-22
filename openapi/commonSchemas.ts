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
    errors: z.any().nullable().optional(),
});

type SuccessParams = {
    data?: any;
    dataSchema?: any;
    message?: string;
    headers?: Record<string, any>;
};

type ErrorParams = {
    message?: string;
    status?: number;
    errors?: any;
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

export function errorResponse({ message, errors }: ErrorParams) {
    return {
        description: message || 'Error response',
        content: {
            'application/json': {
                schema: createErrorSchema(message),
                example: {
                    success: false,
                    data: null,
                    message,
                    errors: errors || null,
                },
            },
        },
    };
}
