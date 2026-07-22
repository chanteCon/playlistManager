import { CodeType, UserCode } from 'features/auth/types';
import { randomUUID, createHash, randomBytes } from 'crypto';
import { CreateCodeInput } from 'shared/userCodes/codeRepo';

const PASSWORD_RESET_CODE_EXP_MS = 5 * 60 * 1000;

export const buildCodeInput = (
    codeType: CodeType,
    overrides: Partial<CreateCodeInput> = {},
): CreateCodeInput => {
    return {
        userId: randomUUID(),
        codeHash: createHash('sha256').update(randomBytes(32).toString('hex')).digest('hex'),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_CODE_EXP_MS),
        codeType,
        ...overrides,
    };
};
export const buildCode = (
    codeType: CodeType,
    overrides: Partial<CreateCodeInput> = {},
): UserCode => {
    const tokenData = buildCodeInput(codeType);
    return {
        id: randomUUID(),
        ...tokenData,
        codeType,
        ...overrides,
    };
};
