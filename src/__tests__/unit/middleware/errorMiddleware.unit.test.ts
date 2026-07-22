import { mockLogger } from '__tests__/shared/mocks/mockLogger';

import { errorHandler } from 'middleware/errorMiddleware';
import { NextFunction, Request, Response } from 'express';
import { buildExpressMocks } from '__tests__/shared/mocks/expressMock';
import { BadInputError, ValidationError } from 'shared/errors/errors';

describe('Unit tests: Error middleware', () => {
    let mockReq: Request;
    let mockRes: Response;
    let mockNext: NextFunction;
    test('Should set status code and message from error', () => {
        ({ mockRes, mockNext } = buildExpressMocks());
        mockReq = {} as unknown as Request;
        const error = new BadInputError('Example error');
        errorHandler(error, mockReq, mockRes, mockNext);
        expect(mockLogger.error).toHaveBeenCalledWith(error);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: error.message,
            success: false,
            data: null,
            errors: null,
        });
    });
    test('Should transform non app errors to Internal server errors', () => {
        ({ mockRes, mockNext } = buildExpressMocks());
        mockReq = {} as unknown as Request;
        const error = new Error('Unexpected error');
        errorHandler(error, mockReq, mockRes, mockNext);
        expect(mockLogger.error).toHaveBeenCalledWith(error);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Internal Server Error',
            success: false,
            data: null,
            errors: null,
        });
    });
    test('Should add errors to validation error', () => {
        ({ mockRes, mockNext } = buildExpressMocks());
        const mockReq = {} as unknown as Request;
        const errors = { id: 'missing id' };
        const error = new ValidationError('Invalid Input', errors);

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockLogger.error).toHaveBeenCalledWith(error);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            data: null,
            message: 'Invalid Input',
            errors,
        });
    });
    test('Should throw 400 error if request is not valid json', () => {
        ({ mockRes, mockNext } = buildExpressMocks());
        const mockReq = {} as unknown as Request;
        const error = {
            type: 'entity.parse.failed',
            message: 'Unexpected token } in JSON',
        };
        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                data: null,
                message: 'Invalid JSON',
                errors: { body: ['Malformed JSON'] },
            }),
        );
    });
});
