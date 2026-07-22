import { CodeRepo } from 'shared/userCodes/codeRepo';

export const mockCodeRepo: jest.Mocked<CodeRepo> = {
    save: jest.fn(),
    remove: jest.fn(),
};
