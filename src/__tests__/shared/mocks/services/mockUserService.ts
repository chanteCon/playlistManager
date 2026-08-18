import { UserService } from 'features/user/userService';

export const mockUserService: jest.Mocked<UserService> = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findAuthUserById: jest.fn(),
    findInternalUserByEmail: jest.fn(),
    findAll: jest.fn(),
    updatePassword: jest.fn(),
    verify: jest.fn(),
    findVerifiedById: jest.fn(),
    findVerifiedByEmail: jest.fn(),
    updateEmail: jest.fn(),
};
