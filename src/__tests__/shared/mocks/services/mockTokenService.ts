import { TokenService } from 'features/auth/services/tokenService';

export const mockTokenService: jest.Mocked<TokenService> = {
    rotateTokens: jest.fn(),
    generateTokens: jest.fn(),
    revokeAllForUser: jest.fn(),
    revokeAllForDeviceId: jest.fn(),
};
