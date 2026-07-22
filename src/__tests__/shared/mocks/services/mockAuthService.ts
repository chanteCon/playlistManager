import { AuthService } from 'features/auth/services/authService';

export const mockAuthService: jest.Mocked<AuthService> = {
    startLogin: jest.fn(),
    loginMfa: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    resetPassword: jest.fn(),
    verifyUser: jest.fn(),
    issueCodeForEmail: jest.fn(),
};
