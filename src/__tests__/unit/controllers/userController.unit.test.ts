import { randomBytes } from 'crypto';
import { AuthRequest } from 'features/auth/types';
import { PublicUser } from 'features/user/types';
import { buildPublicUser, buildPublicUsers } from '__tests__/shared/factories';
import { Response, Request } from 'express';
import { buildExpressMocks } from '__tests__/shared/mocks/expressMock';
import { mockUserService } from '__tests__/shared/mocks/services';
import { expectMockResponse } from '__tests__/shared/helpers/controllerAssertions';
import { createUserController } from 'features/user/userController';

const userController = createUserController(mockUserService);

describe('Unit tests: User controller', () => {
    let user: PublicUser;
    let mockRes: Response;
    beforeEach(() => {
        jest.clearAllMocks();
        user = buildPublicUser();
        ({ mockRes } = buildExpressMocks());
    });
    describe('Auth Requests', () => {
        let mockReq: AuthRequest;
        beforeEach(() => {
            mockReq = {
                user: { id: user.id, deviceId: randomBytes(32).toString('hex') },
            } as unknown as AuthRequest;
        });
        describe('Update authenticated user', () => {
            test('Returns 200 status with user data', async () => {
                mockReq.body = { username: 'newUsername' };
                mockUserService.update.mockResolvedValue(user);
                await userController.updateAuthenticatedUser(mockReq, mockRes);
                expect(mockUserService.update).toHaveBeenCalledWith({
                    id: mockReq.user!.id,
                    data: mockReq.body,
                });
                expectMockResponse({ mockRes, data: { user } });
            });
            test('Throws error from service', async () => {
                mockReq.body = { username: 'newUsername' };
                const error = new Error('Service layer error');
                mockUserService.update.mockRejectedValue(error);
                await expect(
                    userController.updateAuthenticatedUser(mockReq, mockRes),
                ).rejects.toThrow(error);
                expect(mockUserService.update).toHaveBeenCalledWith({
                    id: mockReq.user!.id,
                    data: mockReq.body,
                });
            });
        });
        describe('Delete authenticated user', () => {
            test('Returns 204 status with user id', async () => {
                mockUserService.remove.mockResolvedValueOnce(user.id);
                await userController.deleteAuthenticatedUser(mockReq, mockRes);
                expect(mockUserService.remove).toHaveBeenCalledWith(mockReq.user!.id);
                expectMockResponse({ mockRes, status: 204, json: false });
            });
            test('Throws error from service', async () => {
                const error = new Error('Service layer error');
                mockUserService.remove.mockRejectedValueOnce(error);
                await expect(
                    userController.deleteAuthenticatedUser(mockReq, mockRes),
                ).rejects.toThrow(error);
                expect(mockUserService.remove).toHaveBeenCalledWith(mockReq.user!.id);
            });
        });
        describe('Get authenticated user', () => {
            test('Returns 200 with user details', async () => {
                mockUserService.findAuthUserById.mockResolvedValueOnce(user);
                await userController.getAuthenticatedUser(mockReq, mockRes);
                expect(mockUserService.findAuthUserById).toHaveBeenCalledWith(mockReq.user!.id);
                expectMockResponse({ mockRes, data: { user } });
            });
            test('Throws error from service', async () => {
                const error = new Error('Service layer error');
                mockUserService.findAuthUserById.mockRejectedValueOnce(error);
                await expect(userController.getAuthenticatedUser(mockReq, mockRes)).rejects.toThrow(
                    error,
                );
                expect(mockUserService.findAuthUserById).toHaveBeenCalledWith(mockReq.user!.id);
            });
        });
    });

    describe('Non auth requests', () => {
        describe('Get user by id', () => {
            test('Returns 200 with user details', async () => {
                const mockReq = { params: { id: user.id } } as unknown as Request<{ id: string }>;
                mockUserService.findVerifiedById.mockResolvedValue(user);
                await userController.getUserById(mockReq, mockRes);
                expect(mockUserService.findVerifiedById).toHaveBeenCalledWith(mockReq.params.id);
                expectMockResponse({ mockRes, data: { user } });
            });
            test('Throws error from service', async () => {
                const mockReq = { params: { id: user.id } } as unknown as Request<{ id: string }>;
                const error = new Error('Service layer error');
                mockUserService.findVerifiedById.mockRejectedValueOnce(error);
                await expect(userController.getUserById(mockReq, mockRes)).rejects.toThrow(error);
                expect(mockUserService.findVerifiedById).toHaveBeenCalledWith(mockReq.params.id);
            });
        });
        describe('Get all users', () => {
            const mockReq = {} as unknown as Request;
            test('Returns 200 with users array', async () => {
                const users = buildPublicUsers();
                mockUserService.findAll.mockResolvedValueOnce(users);
                await userController.getAllUsers(mockReq, mockRes);
                expect(mockUserService.findAll).toHaveBeenCalledTimes(1);
                expectMockResponse({ mockRes, data: { users } });
            });
            test('Returns 200 with empty array if no users', async () => {
                mockUserService.findAll.mockResolvedValueOnce([]);
                await userController.getAllUsers(mockReq, mockRes);
                expect(mockUserService.findAll).toHaveBeenCalledTimes(1);
                expectMockResponse({ mockRes, data: { users: [] } });
            });
            test('Throws error from service', async () => {
                const error = new Error('Service layer error');
                mockUserService.findAll.mockRejectedValueOnce(error);
                await expect(userController.getAllUsers(mockReq, mockRes)).rejects.toThrow(error);
                expect(mockUserService.findAll).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Update email', () => {
        let mockReq: AuthRequest;
        const email = 'new@email.com';
        beforeEach(() => {
            mockReq = {
                body: { email },
                user: { id: user.id },
            } as unknown as AuthRequest;
        });
        test('Returns 200 and message on success', async () => {
            mockUserService.updateEmail.mockResolvedValueOnce(undefined);
            await userController.updateEmail(mockReq, mockRes);
            expectMockResponse({
                mockRes,
                message: 'A verification code has been sent, please check email',
            });
            expect(mockUserService.updateEmail).toHaveBeenCalledWith({ id: user.id, email });
        });
        test('Throws error', async () => {
            const error = new Error('Service error');
            mockUserService.updateEmail.mockRejectedValue(error);
            await expect(userController.updateEmail(mockReq, mockRes)).rejects.toThrow(error);
            expect(mockUserService.updateEmail).toHaveBeenCalledWith({ id: user.id, email });
        });
    });
});
