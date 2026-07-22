jest.mock('shared/logger/logger', () => ({
    logger: {
        error: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

import { logger } from 'shared/logger/logger';

export const mockLogger = logger as jest.Mocked<typeof logger>;
