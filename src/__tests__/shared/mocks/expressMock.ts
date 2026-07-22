import { NextFunction, Response } from 'express';

export const buildExpressMocks = () => {
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        cookie: jest.fn(),
        clearCookie: jest.fn(),
        send: jest.fn(),
        locals: { message: {} },
    } as unknown as Response;
    const mockNext: jest.MockedFunction<NextFunction> = jest.fn();
    return { mockRes, mockNext };
};
