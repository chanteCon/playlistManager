import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, UnauthorisedError } from 'shared/errors/errors';

export const PRISMA_NOT_FOUND_ERROR = 'P2025';
export const PRISMA_UNIQUE_CONTSTRAINT_ERROR = 'P2002';
export const PRISMA_FOREIGN_KEY_ERROR = 'P2003';

export const handleNotFoundError = (error: any, msg: string) => {
    if (isNotFoundError(error)) {
        throw new NotFoundError(msg);
    }
    throw error;
};

export const translateNotFoundToUnAuth = (error: any, msg: string) => {
    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_NOT_FOUND_ERROR
    ) {
        throw new UnauthorisedError(msg);
    }
    if (error instanceof NotFoundError) {
        throw new UnauthorisedError(msg);
    }
};

export const isNotFoundError = (error: any) => {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_NOT_FOUND_ERROR
    );
};

export const isUniqueConstraintError = (error: any) => {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONTSTRAINT_ERROR
    );
};

export const translateForeignKeyError = (
    error: unknown,
    ErrorType: new (message: string) => Error,
    message: string,
) => {
    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_FOREIGN_KEY_ERROR
    ) {
        throw new ErrorType(message);
    }
};
export const handleUniqueConstraintError = (error: any, message?: string) => {
    if (isUniqueConstraintError(error)) {
        if (message) {
            throw new ConflictError(message);
        }
        const match = error.message.match(/Unique constraint failed on the fields: \(.+\)/);
        const field =
            match?.[0]?.slice(match[0].indexOf('(') + 1, match[0].indexOf(')')).replace(/`/g, '') ??
            'value';
        const fieldsStr = field[0].toUpperCase() + field.slice(1);
        throw new ConflictError(`${fieldsStr} already in use`);
    }
};
