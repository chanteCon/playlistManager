export class AppError extends Error {
    status: number;
    cause?: unknown;
    errors?: Record<string, string[]>;

    constructor(message: string, status = 500, errors?: Record<string, string[]>) {
        super(message);
        this.status = status;
        this.errors = errors;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Not found', errors?: Record<string, string[]>) {
        super(message, 404, errors);
    }
}

export class BadInputError extends AppError {
    constructor(message = 'Invalid input') {
        super(message, 400);
    }
}

export class ValidationError extends BadInputError {
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
    constructor(message = 'Unauthorised', errors?: any) {
        super(message, 401, errors);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict', errors?: any) {
        super(message, 409);
        this.errors = errors;
    }
}

export class BadGatewayError extends AppError {
    constructor(message = 'Bad gateway') {
        super(message, 502);
    }
}
