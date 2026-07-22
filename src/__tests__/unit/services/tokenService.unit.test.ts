import { mockUserService } from '__tests__/shared/mocks/services';
import { mockRefreshTokenRepo } from '__tests__/shared/mocks/repos';

import { PublicUser } from 'features/user/types';
import { RefreshToken } from '@prisma/client';
import { buildUserInput, buildPublicUser } from '__tests__/shared/factories';
import { buildRefreshToken, buildRefreshTokenInput } from '__tests__/shared/factories';

import { randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';

import { UnauthorisedError } from 'shared/errors/errors';
import { hashString } from 'shared/utils/hashing';
import { createTokenService } from 'features/auth/services/tokenService';

const ACCESS_TOKEN_SECRET: string = process.env.ACCESS_TOKEN_SECRET!;

let user: PublicUser;
let dbRefreshToken: RefreshToken;

const plainToken: string = randomBytes(64).toString('hex');
const tokenService = createTokenService({ refreshTokenRepo: mockRefreshTokenRepo });

describe('Unit tests: Token service', () => {
    beforeEach(async () => {
        jest.resetAllMocks();
        const userInputData = buildUserInput();
        user = buildPublicUser(userInputData);
        const refreshTokenData = buildRefreshTokenInput({
            userId: user.id,
            tokenHash: hashString(plainToken),
        });
        dbRefreshToken = buildRefreshToken(refreshTokenData);
    });

    describe('Generate tokens', () => {
        const saveMockCalledWith = (data: Record<string, string>) => {
            expect(mockRefreshTokenRepo.save).toHaveBeenCalledWith({
                data: expect.objectContaining(data),
            });
        };
        test('Successfully generates and returns access and refresh tokens', async () => {
            mockRefreshTokenRepo.save.mockResolvedValueOnce(dbRefreshToken);

            const deviceId = randomBytes(32).toString('hex');
            const authUser = { id: user.id, deviceId };
            const { accessToken, refreshToken } = await tokenService.generateTokens({ authUser });
            const payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as jwt.JwtPayload;
            expect(payload.id).toEqual(user.id);
            expect(payload.deviceId).toEqual(deviceId);
            expect(payload.exp).toBeDefined();

            const tokenHash = hashString(refreshToken);
            expect(mockRefreshTokenRepo.save).toHaveBeenCalledTimes(1);
            saveMockCalledWith({
                deviceId,
                userId: user.id,
                tokenHash,
                expiresAt: expect.any(Date),
            });
        });

        test('Uses prisma client if provided', async () => {
            mockRefreshTokenRepo.save.mockResolvedValueOnce(dbRefreshToken);

            const deviceId = randomBytes(32).toString('hex');
            const authUser = { id: user.id, deviceId };
            const { accessToken: _accessToken, refreshToken: _refreshToken } =
                await tokenService.generateTokens({ authUser });
            expect(mockRefreshTokenRepo.save).toHaveBeenCalledTimes(1);
            saveMockCalledWith({ userId: user.id, deviceId });
        });

        test('Throws if unexpected error adding refresh token to db', async () => {
            mockRefreshTokenRepo.save.mockRejectedValueOnce(new Error('Db down'));
            const deviceId = randomBytes(32).toString('hex');
            const authUser = { id: user.id, deviceId };
            await expect(tokenService.generateTokens({ authUser })).rejects.toThrow('Db down');
            saveMockCalledWith({ userId: user.id, deviceId });
        });

        describe('RotateTokens', () => {
            test('Successfully issues new access and refresh token for valid refresh token input', async () => {
                mockRefreshTokenRepo.consume.mockResolvedValueOnce({
                    ...dbRefreshToken,
                    userVerified: true,
                    isReuse: false,
                });
                mockRefreshTokenRepo.revokeAllForDeviceId.mockResolvedValueOnce(undefined);

                const { accessToken, refreshToken } = await tokenService.rotateTokens(plainToken);

                expect(typeof accessToken).toEqual('string');
                expect(typeof refreshToken).toEqual('string');

                expect(mockRefreshTokenRepo.consume).toHaveBeenCalledTimes(1);
                expect(mockRefreshTokenRepo.consume).toHaveBeenCalledWith(hashString(plainToken));

                expect(mockRefreshTokenRepo.revokeAllForDeviceId).toHaveBeenCalledTimes(1);
                expect(mockRefreshTokenRepo.revokeAllForDeviceId).toHaveBeenCalledWith({
                    deviceId: dbRefreshToken.deviceId,
                    id: dbRefreshToken.userId,
                });
            });
            test('Throws if input token not found', async () => {
                mockRefreshTokenRepo.consume.mockResolvedValue(undefined);

                const badToken = randomBytes(64).toString('hex');
                await expect(tokenService.rotateTokens(badToken)).rejects.toThrow('Invalid token');

                expect(mockRefreshTokenRepo.consume).toHaveBeenCalledTimes(1);
                expect(mockRefreshTokenRepo.consume).toHaveBeenCalledWith(hashString(badToken));

                expect(mockRefreshTokenRepo.revokeAllForDeviceId).toHaveBeenCalledTimes(0);
            });
            test('Throws if input token has expired', async () => {
                dbRefreshToken.expiresAt = new Date(Date.now() - 1000 * 60 * 60);
                mockRefreshTokenRepo.consume.mockResolvedValueOnce({
                    ...dbRefreshToken,
                    userVerified: true,
                    isReuse: false,
                });
                mockRefreshTokenRepo.revokeAllForDeviceId.mockResolvedValueOnce(undefined);

                await expect(tokenService.rotateTokens(plainToken)).rejects.toThrow(
                    'Invalid token',
                );
                expect(mockRefreshTokenRepo.revokeAllForDeviceId).toHaveBeenCalledTimes(1);
            });
            test('Throws if user is not verified', async () => {
                mockRefreshTokenRepo.consume.mockResolvedValueOnce({
                    ...dbRefreshToken,
                    userVerified: false,
                    isReuse: false,
                });
                mockRefreshTokenRepo.revokeAllForDeviceId.mockResolvedValueOnce(undefined);
                const error = new UnauthorisedError('Invalid token');
                mockUserService.findVerifiedById.mockRejectedValueOnce(error);

                await expect(tokenService.rotateTokens(plainToken)).rejects.toThrow(
                    'Invalid token',
                );
                expect(mockRefreshTokenRepo.revokeAllForDeviceId).toHaveBeenCalledTimes(1);
            });
        });
    });
});
