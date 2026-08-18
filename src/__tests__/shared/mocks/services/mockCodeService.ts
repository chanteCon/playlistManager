import { CodeService } from 'shared/userCodes/codeService';

export const mockCodeService: jest.Mocked<CodeService> = {
    issueCodeForUser: jest.fn(),
    verifyCode: jest.fn(),
    removeAllForUser: jest.fn(),
};
