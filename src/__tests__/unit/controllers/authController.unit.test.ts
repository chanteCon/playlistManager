import { Response, Request } from 'express';
import { User } from 'features/user/types';
import { buildUser } from '__tests__/shared/factories';
import { buildExpressMocks } from '__tests__/shared/mocks/expressMock';
import { mockAuthService, mockTokenService } from '__tests__/shared/mocks/services';
import { createAuthController } from 'features/auth/authController';
import {
    expectMockResponse,
    expectMockCookie,
    expectMockCookieCleared,
} from '__tests__/shared/helpers/controllerAssertions';
import { randomBytes } from 'crypto';
import { AuthRequest } from 'features/auth/types';
import { UnauthorisedError } from 'shared/errors/errors';

let accessToken: string;
let refreshToken: string;
let deviceId: string;

const authController = createAuthController({
    services: {
        authService: mockAuthService,
        tokenService: mockTokenService,
    },
});

describe('Unit tests: Auth controllers', () => {
    let user: User;
    let mockRes: Response;
    beforeEach(() => {
        jest.clearAllMocks();
        user = buildUser();
        ({ mockRes } = buildExpressMocks());
        accessToken = randomBytes(32).toString('hex');
        refreshToken = randomBytes(64).toString('hex');
        deviceId = randomBytes(32).toString('hex');
    });

    describe('Register', () => {
        let mockReq: Request;
        beforeEach(() => {
            mockReq = {
                body: { email: user.email, password: user.password, username: user.username },
            } as unknown as Request;
        });
        test('Returns 201 and accessToken and sets cookies on success', async () => {
            mockAuthService.register.mockResolvedValueOnce();
            await authController.register(mockReq, mockRes);
            expect(mockAuthService.register).toHaveBeenCalledWith(mockReq.body);
            expectMockResponse({ mockRes, data: {}, status: 201 });
        });
        test('Throws service error', async () => {
            const error = new Error('Service error');
            mockAuthService.register.mockRejectedValue(error);
            await expect(authController.register(mockReq, mockRes)).rejects.toThrow(error);
            expect(mockAuthService.register).toHaveBeenCalledWith(mockReq.body);
        });
    });
    describe('Login', () => {
        let mockReq: Request;

        beforeEach(() => {
            mockReq = {
                body: { email: user.email, password: user.password },
            } as unknown as Request;
        });
        test('Returns 200 and accessToken and sets cookies on success', async () => {
            mockAuthService.startLogin.mockResolvedValueOnce();
            await authController.startLogin(mockReq, mockRes);
            expect(mockAuthService.startLogin).toHaveBeenCalledWith(mockReq.body);
            expectMockResponse({
                mockRes,
                message: 'If email is valid you will receive a login code',
            });
        });
        test('Throws service error', async () => {
            const error = new Error('Service error');
            mockAuthService.startLogin.mockRejectedValueOnce(error);
            await expect(authController.startLogin(mockReq, mockRes)).rejects.toThrow(error);
            expect(mockAuthService.startLogin).toHaveBeenCalledWith(mockReq.body);
        });
    });
    describe('Logout', () => {
        let mockReq: AuthRequest;
        beforeEach(() => {
            mockReq = {
                user: { id: user.id, deviceId },
            } as unknown as AuthRequest;
        });
        test('Returns 200 and message and clears cookies on success', async () => {
            mockAuthService.logout.mockResolvedValueOnce();
            await authController.logout(mockReq, mockRes);
            expect(mockAuthService.logout).toHaveBeenCalledWith(mockReq.user);
            expectMockResponse({ mockRes, message: 'Successfully logged out.' });
            expectMockCookieCleared({
                mockRes,
                name: 'refreshToken',
                path: '/api/auth',
            });
        });
        test('Clears cookies and throws service error', async () => {
            const error = new Error('Service error');
            mockAuthService.logout.mockRejectedValueOnce(error);
            await expect(authController.logout(mockReq, mockRes)).rejects.toThrow(error);
            expect(mockRes.clearCookie).toHaveBeenCalledTimes(1);
            expect(mockAuthService.logout).toHaveBeenCalledWith(mockReq.user);
            expectMockCookieCleared({
                mockRes,
                name: 'refreshToken',
                path: '/api/auth',
            });
        });
    });
    describe('Login Mfa', () => {
        let mockReq: Request;
        beforeEach(() => {
            mockReq = { body: { code: 'testCode' } } as unknown as Request;
        });
        test('Should return access token and set refresh token and device id cookies', async () => {
            mockAuthService.loginMfa.mockResolvedValueOnce({ accessToken, refreshToken, deviceId });
            await authController.loginMfa(mockReq, mockRes);
            expectMockResponse({ mockRes, data: { accessToken } });
            expectMockCookie({ mockRes, path: '/', name: 'deviceId', value: deviceId });
            expectMockCookie({
                mockRes,
                path: '/api/auth',
                name: 'refreshToken',
                value: refreshToken,
            });
            expect(mockRes.cookie).toHaveBeenCalledTimes(2);
            expect(mockAuthService.loginMfa).toHaveBeenCalledWith({ code: mockReq.body.code });
        });
        test('Should pass existing device id to service', async () => {
            mockReq.cookies = { deviceId: 'existingDeviceId' };
            mockAuthService.loginMfa.mockResolvedValueOnce({
                accessToken,
                refreshToken,
                deviceId: 'existingDeviceId',
            });
            await authController.loginMfa(mockReq, mockRes);
            expectMockResponse({ mockRes, data: { accessToken } });
            expectMockCookie({
                mockRes,
                path: '/api/auth',
                name: 'refreshToken',
                value: refreshToken,
            });
            expectMockCookie({ mockRes, path: '/', name: 'deviceId', value: 'existingDeviceId' });
            expect(mockRes.cookie).toHaveBeenCalledTimes(2);
            expect(mockAuthService.loginMfa).toHaveBeenCalledWith({
                code: mockReq.body.code,
                existingDeviceId: 'existingDeviceId',
            });
        });
        test('Throws error from service', async () => {
            const error = new UnauthorisedError('Invalid or expired login code');
            mockAuthService.loginMfa.mockRejectedValue(error);
            await expect(authController.loginMfa(mockReq, mockRes)).rejects.toThrow(error);
            expect(mockAuthService.loginMfa).toHaveBeenCalledWith({
                code: mockReq.body.code,
            });
        });
    });
    describe('Rotate tokens', () => {
        let mockReq: Request;
        beforeEach(() => {
            mockReq = {} as unknown as Request;
        });
        test('Returns 200 and accessToken and sets refreshToken cookie on success', async () => {
            mockReq.cookies = { refreshToken };
            mockTokenService.rotateTokens.mockResolvedValueOnce({ accessToken, refreshToken });
            await authController.rotateTokens(mockReq, mockRes);
            expect(mockTokenService.rotateTokens).toHaveBeenCalledWith(refreshToken);
            expectMockResponse({ mockRes, data: { accessToken } });
            expectMockCookieCleared({ mockRes, path: '/api/auth', name: 'refreshToken' });
        });
        test('Throws error if refresh token cookie missing', async () => {
            const error = new UnauthorisedError('Unauthorized');
            await expect(authController.rotateTokens(mockReq, mockRes)).rejects.toThrow(error);
        });
        test('Throws error from service layer and calls next', async () => {
            const error = new Error('Service layer error');
            mockReq.cookies = { refreshToken };
            mockTokenService.rotateTokens.mockRejectedValueOnce(error);
            await expect(authController.rotateTokens(mockReq, mockRes)).rejects.toThrow(error);
            expect(mockTokenService.rotateTokens).toHaveBeenCalledWith(refreshToken);
            expectMockCookieCleared({ mockRes, path: '/api/auth', name: 'refreshToken' });
        });
    });
    describe('Request password reset', () => {
        let mockReq: Request;
        beforeEach(() => {
            mockReq = { body: { email: user.email } } as unknown as Request;
        });
        test('Returns 200 and message on success', async () => {
            const code = randomBytes(32).toString('hex');
            mockAuthService.issueCodeForEmail.mockResolvedValueOnce(code);
            await authController.requestPasswordReset(mockReq, mockRes);
            const data = { email: mockReq.body.email, codeType: 'PASSWORD_RESET' };
            expect(mockAuthService.issueCodeForEmail).toHaveBeenCalledWith(data);
            expectMockResponse({
                mockRes,
                data: {},
                message: 'If email is valid you will receive a code',
            });
        });
        test('Throws error', async () => {
            const error = new Error('Service error');
            mockAuthService.issueCodeForEmail.mockRejectedValueOnce(error);
            await expect(authController.requestPasswordReset(mockReq, mockRes)).rejects.toThrow(
                error,
            );
            const data = { email: mockReq.body.email, codeType: 'PASSWORD_RESET' };
            expect(mockAuthService.issueCodeForEmail).toHaveBeenCalledWith(data);
        });
    });
    describe('Verify', () => {
        let mockReq: Request;
        beforeEach(() => {
            mockReq = { body: { code: 'testCode' } } as unknown as Request;
        });
        test('Returns 200 and message on success', async () => {
            mockAuthService.verifyUser.mockResolvedValueOnce();
            await authController.verify(mockReq, mockRes);
            expectMockResponse({
                mockRes,
                message: 'Email successfully verified, please startLogin',
            });
            expect(mockAuthService.verifyUser).toHaveBeenCalledWith('testCode');
        });
        test('Throws error', async () => {
            const error = new Error('Service error');
            mockAuthService.verifyUser.mockRejectedValueOnce(error);
            await expect(authController.verify(mockReq, mockRes)).rejects.toThrow(error);
            expect(mockAuthService.verifyUser).toHaveBeenCalledWith('testCode');
        });
    });
    describe('Request verification code', () => {
        let mockReq: Request;
        beforeEach(() => {
            mockReq = { body: { email: user.email } } as unknown as Request;
        });
        test('Returns 200 and message on success', async () => {
            mockAuthService.issueCodeForEmail.mockResolvedValueOnce('test-code');
            await authController.requestVerificationCode(mockReq, mockRes);
            expectMockResponse({ mockRes, message: 'If email is valid you will receive a code' });
            const data = { email: mockReq.body.email, codeType: 'VERIFICATION' };
            expect(mockAuthService.issueCodeForEmail).toHaveBeenCalledWith(data);
        });
        test('Throws error', async () => {
            const error = new Error('Service error');
            mockAuthService.issueCodeForEmail.mockRejectedValueOnce(error);
            await expect(authController.requestVerificationCode(mockReq, mockRes)).rejects.toThrow(
                error,
            );
            const data = { email: mockReq.body.email, codeType: 'VERIFICATION' };
            expect(mockAuthService.issueCodeForEmail).toHaveBeenCalledWith(data);
        });
    });

    describe('Reset password', () => {
        let mockReq: Request;
        const code = randomBytes(32).toString('hex');
        const password = 'newPassword';
        beforeEach(() => {
            mockReq = { body: { code, password } } as unknown as Request;
        });
        test('Returns 200 and message on success', async () => {
            mockAuthService.resetPassword.mockResolvedValueOnce(user);
            await authController.resetPassword(mockReq, mockRes);
            expect(mockAuthService.resetPassword).toHaveBeenCalledWith(mockReq.body);
            expectMockResponse({ mockRes, message: 'Password successfully reset' });
        });
        test('Throws error', async () => {
            const error = new Error('Service error');
            mockAuthService.resetPassword.mockRejectedValueOnce(error);
            await expect(authController.resetPassword(mockReq, mockRes)).rejects.toThrow(error);
            expect(mockAuthService.resetPassword).toHaveBeenCalledWith(mockReq.body);
        });
    });
});
