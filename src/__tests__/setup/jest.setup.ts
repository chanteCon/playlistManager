import { mockLogger } from '__tests__/shared/mocks/mockLogger';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test', quiet: true });

jest.mock('shared/logger/logger', () => ({
    logger: mockLogger,
}));

jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn(),
    })),
}));
