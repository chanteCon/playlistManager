import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import { mockCodeRepo } from '__tests__/shared/mocks/repos';
import { mockEmailService } from '__tests__/shared/mocks/services';

import { PublicUser, User } from 'features/user/types';
import { CreateAccountInput, CodeType, UserCode } from 'features/auth/types';
import { buildUserInput, buildUser, buildPublicUser, buildCode } from '__tests__/shared/factories';

import { hashPassword, hashString } from 'shared/utils/hashing';
import { createCodeService } from 'shared/userCodes/codeService';
import { NotFoundError } from 'shared/errors/errors';

let userInputData: CreateAccountInput;
let user: PublicUser;
let privateUser: User;

const codeService = createCodeService({ codeRepo: mockCodeRepo, emailService: mockEmailService });

describe('Unit tests: Code service', () => {
    beforeEach(async () => {
        jest.resetAllMocks();
        userInputData = buildUserInput();
        user = buildPublicUser(userInputData);
        const passwordHash = await hashPassword(userInputData.password);
        privateUser = buildUser({ ...user, password: passwordHash });
    });

    describe('Issue code for user', () => {
        beforeEach(() => {
            privateUser = buildUser({ ...user, verified: false });
        });

        const codeTypes: CodeType[] = ['VERIFICATION', 'PASSWORD_RESET'];
        test.each(codeTypes)(
            'Should successfully issue %s code and call email service',
            async (codeType) => {
                mockCodeRepo.save.mockResolvedValueOnce(undefined);
                mockEmailService.sendCodeEmail.mockResolvedValueOnce(undefined);
                const code = await codeService.issueCodeForUser({
                    data: { user: privateUser, codeType },
                });
                expect(code).not.toBeNull();
                const codeHash = hashString(code!);
                expect(mockCodeRepo.save).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: {
                            codeType,
                            userId: user.id,
                            expiresAt: expect.any(Date),
                            codeHash,
                        },
                    }),
                );
                expect(mockEmailService.sendCodeEmail).toHaveBeenCalledWith({
                    email: privateUser.email,
                    codeType,
                    code,
                });
            },
        );
        test('Should return before issuing a verification code for a verified user', async () => {
            privateUser.verified = true;
            const code = await codeService.issueCodeForUser({
                data: { user: privateUser, codeType: 'VERIFICATION' },
            });
            expect(code).toBeNull();
            expect(mockCodeRepo.save).toHaveBeenCalledTimes(0);
            expect(mockEmailService.sendCodeEmail).toHaveBeenCalledTimes(0);
        });
        test('Verification status should not affect password reset code issuing', async () => {
            mockCodeRepo.save.mockResolvedValueOnce(undefined);
            mockEmailService.sendCodeEmail.mockResolvedValueOnce(undefined);
            privateUser.verified = true;
            const code = await codeService.issueCodeForUser({
                data: { user: privateUser, codeType: 'PASSWORD_RESET' },
            });
            expect(code).not.toBeNull();
            expect(mockCodeRepo.save).toHaveBeenCalledTimes(1);
            expect(mockEmailService.sendCodeEmail).toHaveBeenCalledTimes(1);
        });
        test('Should log error is unexpected email service error', async () => {
            const error = new Error('Unexpected error');
            mockCodeRepo.save.mockResolvedValueOnce(undefined);
            mockEmailService.sendCodeEmail.mockRejectedValueOnce(error);
            privateUser.verified = true;
            const code = await codeService.issueCodeForUser({
                data: { user: privateUser, codeType: 'PASSWORD_RESET' },
            });
            expect(code).not.toBeNull();
            expect(mockCodeRepo.save).toHaveBeenCalledTimes(1);
            expect(mockEmailService.sendCodeEmail).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });
    });
    describe('Verify code', () => {
        const codePlainStr = 'testCode';
        const codeHash = hashString(codePlainStr);
        let code: UserCode;
        beforeEach(() => {
            code = buildCode('VERIFICATION', { userId: user.id, codeHash });
        });
        test('Should successfully verify code and return user id', async () => {
            mockCodeRepo.remove.mockResolvedValueOnce(code);

            await expect(
                codeService.verifyCode({ code: codePlainStr, codeType: 'VERIFICATION' }),
            ).resolves.toEqual(user.id);
        });
        test('Throws unauthorised error if code not found', async () => {
            mockCodeRepo.remove.mockRejectedValueOnce(new NotFoundError('Code not found'));

            await expect(
                codeService.verifyCode({ code: codePlainStr, codeType: 'PASSWORD_RESET' }),
            ).rejects.toThrow('Invalid or expired password reset code');
        });
    });
});
