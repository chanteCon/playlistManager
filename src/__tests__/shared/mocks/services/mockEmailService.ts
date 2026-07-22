import { EmailService } from 'shared/email/emailService';

export const mockEmailService: jest.Mocked<EmailService> = {
    sendCodeEmail: jest.fn().mockResolvedValue(undefined),
};
