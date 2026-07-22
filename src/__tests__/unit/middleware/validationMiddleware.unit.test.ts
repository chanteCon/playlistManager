import z from 'zod';
import { validate } from 'middleware/validationMiddleware';
import { NextFunction, Request, Response } from 'express';
import { buildExpressMocks } from '__tests__/shared/mocks/expressMock';
import { ValidationError } from 'shared/errors/errors';
import { randomUUID } from 'crypto';

describe('Unit tests: Validation Middleware', () => {
    let mockNext: jest.MockedFunction<NextFunction>;
    let mockRes: Response;
    let mockReq: Request;
    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = { headers: {} } as unknown as Request;
        ({ mockRes, mockNext } = buildExpressMocks());
    });
    test('Should parse request and call next with valid data', () => {
        const id = randomUUID();
        const schema = z.object({ id: z.string() });
        mockReq = { body: { id } } as unknown as Request;
        mockRes = {} as Response;
        mockNext = jest.fn();

        const middleware = validate(schema, 'body');
        middleware(mockReq, mockRes, mockNext);

        expect(mockReq.body).toEqual({ id });
        expect(mockNext).toHaveBeenCalled();
    });

    test('Should throw ValidationError if request does not match schema', () => {
        const schema = z.object({ id: z.number() });
        mockReq = { body: { id: 'not-a-number' } } as unknown as Request;
        mockRes = {} as Response;
        mockNext = jest.fn();

        const middleware = validate(schema, 'body');
        expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(ValidationError);
    });

    test('Should work with req.query', () => {
        const schema = z.object({ search: z.string() });
        const mockReq = { query: { search: 'hello' } } as unknown as Request;
        const middleware = validate(schema, 'query');
        const mockNext = jest.fn();

        middleware(mockReq, {} as Response, mockNext);
        expect(mockReq.query).toEqual({ search: 'hello' });
        expect(mockNext).toHaveBeenCalled();
    });
    test('Should work with req.params', () => {
        const id = randomUUID();
        const schema = z.object({ id: z.string() });
        mockReq = { params: { id } } as unknown as Request;
        mockRes = {} as Response;
        mockNext = jest.fn();

        const middleware = validate(schema, 'params');
        middleware(mockReq, mockRes, mockNext);

        expect(mockReq.params).toEqual({ id });
        expect(mockNext).toHaveBeenCalled();
    });
});
