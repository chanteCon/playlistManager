import type { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from 'shared/errors/errors';
import { logger } from 'shared/logger/logger';

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
    let status = 500;
    let message = 'Internal Server Error';
    let errors;
    if (error instanceof ValidationError) {
        status = 400;
        message = error.message;
        errors = error.errors;
    } else if (error instanceof AppError) {
        status = error.status;
        if (status !== 500) {
            message = error.message;
        }
    } else if (
        typeof error === 'object' &&
        error !== null &&
        'type' in error &&
        (error as any).type === 'entity.parse.failed'
    ) {
        status = 400;
        message = 'Invalid JSON';
        errors = { body: ['Malformed JSON'] };
    }
    logger.error(error);

    res.status(status).json({
        success: false,
        data: null,
        message,
        errors: errors || null,
    });
};
