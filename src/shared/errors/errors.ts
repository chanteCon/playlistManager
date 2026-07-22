export class AppError extends Error {
    status: number;
    cause?: unknown;
    constructor(message: string, status = 500) {
        super(message);
        this.status = status;

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Not found') {
        super(message, 404);
    }
}

export class BadInputError extends AppError {
    constructor(message = 'Invalid input') {
        super(message, 400);
    }
}

export class ValidationError extends BadInputError {
    errors: any;
    constructor(message = 'Invalid input', errors?: any) {
        super(message);
        this.errors = errors;
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

export class UnauthorisedError extends AppError {
    constructor(message = 'Unauthorised') {
        super(message, 401);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(message, 409);
    }
}
