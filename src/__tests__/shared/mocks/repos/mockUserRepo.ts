import { UserRepo } from 'features/user/repos/userRepo';

export const mockUserRepo: jest.Mocked<UserRepo> = {
    create: jest.fn(),
    remove: jest.fn(),
    findAll: jest.fn(),
    findUserInternalById: jest.fn(),
    findUserPublicById: jest.fn(),
    findInternalUserByEmail: jest.fn(),
    findUserPublicByEmail: jest.fn(),
    updateUserPublic: jest.fn(),
    updateUserSensitive: jest.fn(),
    findUserInternalByFilter: jest.fn(),
    findUserPublicByFilter: jest.fn(),
};
