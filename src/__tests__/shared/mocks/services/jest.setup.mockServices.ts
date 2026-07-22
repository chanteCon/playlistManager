import * as JestGlobals from '@jest/globals';

const { jest } = JestGlobals;

jest.mock('features/user/userService', () => ({
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findAuthUserById: jest.fn(),
    findInternalUserByEmail: jest.fn(),
    findAll: jest.fn(),
    updatePassword: jest.fn(),
}));

jest.mock('features/auth/authService', () => ({
    login: jest.fn(),
    logout: jest.fn(),
    rotateTokens: jest.fn(),
    register: jest.fn(),
    generateUserCode: jest.fn(),
    resetPassword: jest.fn(),
}));
