import { logger } from 'shared/logger/logger';

import { PrismaClientTx } from 'database/prisma/dbType';
import { CodeType } from 'features/auth/types';
import { generateRandomString, hashString } from 'shared/utils/hashing';
import { translateNotFoundToUnAuth } from 'database/prisma/repoError';
import { CodeRepo } from './codeRepo';
import { EmailService } from 'shared/email/emailService';
import { User } from 'features/user/types';
import { ForbiddenError } from 'shared/errors/errors';

const CODE_EXP_MS = 5 * 60 * 1000;

type CodeServiceDeps = { emailService: EmailService; codeRepo: CodeRepo };

export type CodeService = ReturnType<typeof createCodeService>;

export const createCodeService = (deps: CodeServiceDeps) => {
    const { codeRepo, emailService } = deps;

    ////////////// Internal functions ////////////////

    const _generateUserCode = async ({
        data,
    }: {
        data: { expiresAt: Date; codeType: CodeType; userId: string };
        tx?: PrismaClientTx;
    }): Promise<string> => {
        const code = generateRandomString(3);
        await codeRepo.save({
            data: { ...data, codeHash: hashString(code) },
        });
        return code;
    };

    ////////////// Exported functions ////////////////

    type IssueUserCodeInput = {
        data: { user: User; codeType: CodeType };
        tx?: PrismaClientTx;
    };

    const issueCodeForUser = async ({ data, tx }: IssueUserCodeInput): Promise<string | null> => {
        const { user, codeType } = data;
        if (user.isDemo && codeType !== 'LOGIN') {
            throw new ForbiddenError('Cannot issue code', {
                user: ['Demo accounts do not have permission to perform this action'],
            });
        }
        if (codeType === 'VERIFICATION' && user.verified) {
            return null;
        }
        const codeData = {
            userId: user.id,
            expiresAt: new Date(Date.now() + CODE_EXP_MS),
            codeType,
        };
        const code = await _generateUserCode({ data: codeData, tx });
        await emailService
            .sendCodeEmail({ email: user.email, code, codeType })
            .catch((err) => logger.error('Failed to send email:', err));

        return code;
    };

    const verifyCode = async ({
        code,
        codeType,
    }: {
        code: string;
        codeType: CodeType;
    }): Promise<string> => {
        const codeTypeStr = codeType.toLowerCase().split('_').join(' ');

        try {
            const codeHash = hashString(code);
            const cachedCode = await codeRepo.remove(codeHash, codeType);
            return cachedCode.userId;
        } catch (error) {
            translateNotFoundToUnAuth(error, `Could not verify ${codeTypeStr} code`, {
                code: [`Invalid or expired ${codeTypeStr} code`],
            });
            throw error;
        }
    };

    const removeAllForUser = async (userId: string): Promise<void> => {
        await codeRepo.removeAllForUser(userId);
    };

    return {
        issueCodeForUser,
        verifyCode,
        removeAllForUser,
    };
};
