import { CodeType } from 'features/auth/types';
import { logger } from 'shared/logger/logger';
import { emailTransporter } from 'config/email.config';

export type EmailService = ReturnType<typeof createEmailService>;

export const createEmailService = () => {
    type SendEmailCodeInput = { code: string; email: string; codeType: CodeType };
    const sendCodeEmail = async ({ code, email, codeType }: SendEmailCodeInput): Promise<void> => {
        const { subject, generateHtml } = emailTemplates[codeType];
        const html = generateHtml(code);
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject,
            html,
        };

        try {
            await emailTransporter.sendMail(mailOptions);
        } catch (err) {
            logger.error('Failed to send email:', err);
        }
    };

    const emailTemplates: Record<
        CodeType,
        { subject: string; generateHtml: (code: string) => string }
    > = {
        VERIFICATION: {
            subject: 'App email verification',
            generateHtml: (code) =>
                `<p>Please enter the below code to verify your email:<br>${code}</p>`,
        },
        PASSWORD_RESET: {
            subject: 'App password reset',
            generateHtml: (code) =>
                `<p>Please enter the below code to reset your password:<br>${code}</p>`,
        },
        LOGIN: {
            subject: 'App login code',
            generateHtml: (code) =>
                `<p>Please enter the below code to reset your password:<br>${code}</p>`,
        },
    };

    return { sendCodeEmail };
};
