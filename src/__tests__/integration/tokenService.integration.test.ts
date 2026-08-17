import { mockEmailService } from '__tests__/shared/mocks/services';

import { RefreshToken } from '@prisma/client';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { seedCode, seedUser } from '__tests__/shared/seeds/seeds';

import { User } from 'features/user/types';
import { hashString } from 'shared/utils/hashing';
import { createAuthServiceFixture } from '__tests__/setup/integration';
import { AuthService } from 'features/auth/services/authService';
import { TokenService } from 'features/auth/services/tokenService';
import { createTestInfrastructure, InfraStructure } from '__tests__/setup/infrastructure';

let testEnv: InfraStructure & { authService: AuthService; tokenService: TokenService };

beforeAll(async () => {
    const infra = await createTestInfrastructure();
    const auth = createAuthServiceFixture({
        ...infra,
        emailService: mockEmailService,
    });
    testEnv = { ...infra, ...auth };
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('Integration tests: Token service', () => {
    describe('rotateTokens', () => {
        let user: User;
        let refreshToken: string;
        beforeEach(async () => {
            await truncateDbTables(testEnv.db);
            await testEnv.redis.flushDb();
            user = await seedUser(testEnv.db, { verified: true, password: 'password' });

            const code = 'loginCode';
            const codeHash = hashString(code);
            await seedCode(testEnv.redis, 'LOGIN', { codeHash, userId: user.id });
            ({ refreshToken } = await testEnv.authService.loginMfa({ code }));
        });
        test('Successfully adds new token to testEnv.db and revokes old ones', async () => {
            const oldToken = refreshToken;
            const { refreshToken: newToken } = await testEnv.tokenService.rotateTokens(oldToken);

            const refreshTokens: RefreshToken[] = await testEnv.db.refreshToken.findMany();
            const dbOldToken = refreshTokens.find((t) => t.tokenHash === hashString(oldToken));
            expect(dbOldToken!.revokedAt).toBeInstanceOf(Date);

            const dbNewToken = refreshTokens.find((t) => t.tokenHash === hashString(newToken));
            expect(dbNewToken!.revokedAt).toBeNull();
        });
        test('Throws if refresh token not in testEnv.db', async () => {
            await expect(testEnv.tokenService.rotateTokens('badtoken')).rejects.toThrow(
                'Invalid token',
            );
        });
        test('Throws if refresh token is expired', async () => {
            const tokenHash = hashString(refreshToken);

            await testEnv.db.refreshToken.update({
                where: { tokenHash },
                data: { expiresAt: new Date(Date.now() - 1000) },
            });

            await expect(testEnv.tokenService.rotateTokens(refreshToken)).rejects.toThrow(
                'Invalid token',
            );
        });

        test('Throws if refresh token is already revoked', async () => {
            const tokenHash = hashString(refreshToken);

            await testEnv.db.refreshToken.update({
                where: { tokenHash },
                data: { revokedAt: new Date() },
            });

            await expect(testEnv.tokenService.rotateTokens(refreshToken)).rejects.toThrow(
                'Invalid token',
            );
        });
        test('Throws if user is not verified', async () => {
            await testEnv.db.user.update({
                where: { id: user.id },
                data: { verified: false },
            });
            await expect(testEnv.tokenService.rotateTokens(refreshToken)).rejects.toThrow(
                'Invalid token',
            );
        });
    });
});
