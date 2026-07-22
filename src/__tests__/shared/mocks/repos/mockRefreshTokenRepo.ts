import { RefreshTokenRepo } from 'features/auth/repos/refreshTokenRepo';

export const mockRefreshTokenRepo: jest.Mocked<RefreshTokenRepo> = {
    save: jest.fn(),
    consume: jest.fn(),
    revokeAllForDeviceId: jest.fn(),
    revokeAllUserTokens: jest.fn(),
};
