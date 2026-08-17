const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN!;
import { NextFunction, Response } from 'express';
import { buildExpressMocks } from '__tests__/shared/mocks/expressMock';
import { AuthRequest } from 'features/auth/types';
import * as jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'crypto';
import { UnauthorisedError } from 'shared/errors/errors';
import { createAuthMiddlware } from 'features/video/authMiddleware';

const authMiddleware = createAuthMiddlware();

describe('Unit tests: Auth middleware', () => {
    let mockNext: jest.MockedFunction<NextFunction>;
    let mockRes: Response;
    let mockReq: AuthRequest;
    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = { headers: {} } as unknown as AuthRequest;
        ({ mockRes, mockNext } = buildExpressMocks());
    });
    test('Should successfully authenitcate user, attach auth payload to request and call next', () => {
        const payload = { id: randomUUID(), deviceId: randomBytes(32).toString('hex') };
        const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
            expiresIn: Number(ACCESS_TOKEN_EXPIRES_IN),
        });
        mockReq.headers = {
            authorization: `Bearer ${accessToken}`,
        };

        authMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toEqual(payload);
    });
    test('Should throw unauthorized error if Authorizaiton header missing', () => {
        expect(() => authMiddleware(mockReq, mockRes, mockNext)).toThrow(
            new UnauthorisedError('Unauthorized'),
        );
    });
    test('Should throw unauthorized error if Authorization header is missing Bearer', () => {
        mockReq.headers = { authorization: 'accessToken' };
        expect(() => authMiddleware(mockReq, mockRes, mockNext)).toThrow(
            new UnauthorisedError('Unauthorized'),
        );
    });
    test('Should throw unauthorized error if access token is missing', () => {
        mockReq.headers = {
            authorization: `Bearer `,
        };
        expect(() => authMiddleware(mockReq, mockRes, mockNext)).toThrow(
            new UnauthorisedError('Unauthorized'),
        );
    });
    test('Should throw unauthorized error if jwt verification fails due to expiry', () => {
        const payload = { id: randomUUID(), deviceId: randomBytes(32).toString('hex') };
        const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
            expiresIn: -1,
        });
        mockReq.headers = {
            authorization: `Bearer ${accessToken}`,
        };
        expect(() => authMiddleware(mockReq, mockRes, mockNext)).toThrow(
            new UnauthorisedError('Unauthorized'),
        );
    });
    test('Should throw unauthorized error if jwt verification fails due to malformed token', () => {
        const payload = { id: randomUUID(), deviceId: randomBytes(32).toString('hex') };
        const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
            expiresIn: Number(ACCESS_TOKEN_EXPIRES_IN),
        });
        const malformedToken = accessToken.slice(0, -5);
        mockReq.headers = {
            authorization: `Bearer ${malformedToken}`,
        };
        expect(() => authMiddleware(mockReq, mockRes, mockNext)).toThrow(
            new UnauthorisedError('Unauthorized'),
        );
    });
    test('Should throw unauthorized error if jwt verification fails due to incorrect secret', () => {
        const payload = { id: randomUUID(), deviceId: randomBytes(32).toString('hex') };
        const accessToken = jwt.sign(payload, randomBytes(64).toString('hex'), {
            expiresIn: Number(ACCESS_TOKEN_EXPIRES_IN),
        });
        mockReq.headers = {
            authorization: `Bearer ${accessToken}`,
        };
        expect(() => authMiddleware(mockReq, mockRes, mockNext)).toThrow(
            new UnauthorisedError('Unauthorized'),
        );
    });
});
