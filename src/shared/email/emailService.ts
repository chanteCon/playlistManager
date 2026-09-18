import { CodeType } from 'features/auth/types';
import { logger } from 'shared/logger/logger';
import { emailTransporter } from 'config/email.config';

export type EmailService = ReturnType<typeof createEmailService>;

export const createEmailService = () => {
    type SendEmailCodeInput = { code: string; email: string; codeType: CodeType };
    const sendCodeEmail = async ({ code, email, codeType }: SendEmailCodeInput): Promise<void> => {
        const { subject, generateHtml } = emailTemplates[codeType];
        const html = generateHtml(code);
        try {
            if (process.env.NODE_ENV === 'production') {
                const apiKey = process.env.EMAIL_USER;
                const secretKey = process.env.EMAIL_PASS;

                const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

                const response = await fetch('https://api.mailjet.com/v3.1/send', {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${credentials}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        Messages: [
                            {
                                From: {
                                    Email: process.env.EMAIL_FROM,
                                    Name: process.env.EMAIL_FROM_NAME,
                                },
                                To: [
                                    {
                                        Email: email,
                                    },
                                ],
                                Subject: subject,
                                HTMLPart: html,
                            },
                        ],
                    }),
                });

                if (!response.ok) {
                    const body = await response.text();

                    throw new Error(`Mailjet API error (${response.status}): ${body}`);
                }
            } else {
                await emailTransporter.sendMail({
                    from: process.env.EMAIL_FROM,
                    to: email,
                    subject,
                    html,
                });
            }
        } catch (err) {
            logger.error('Failed to send email:', err);
            throw err;
        }
    };
    const generateCodeEmail = ({
        heading,
        message,
        code,
    }: {
        heading: string;
        message: string;
        code: string;
    }) => `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #302c38;">
        <h2 style="margin: 0 0 16px; color: #a8326f;">
            ${heading}
        </h2>

        <p style="margin: 0 0 24px; line-height: 1.6;">
            ${message}
        </p>

        <div style="text-align: center; margin: 28px 0;">
            <span style="font-size: 30px; font-weight: bold; letter-spacing: 6px; color: #a8326f;">
                ${code}
            </span>
        </div>

        <p style="margin: 0; text-align: center; font-size: 14px; font-weight: bold; color: #a8326f;">
            This code expires in 5 minutes.
        </p>
    </div>
`;

    const emailTemplates: Record<
        CodeType,
        { subject: string; generateHtml: (code: string) => string }
    > = {
        VERIFICATION: {
            subject: 'Verify your Playlists email',
            generateHtml: (code) =>
                generateCodeEmail({
                    heading: 'Verify your email',
                    message: 'Enter the code below to verify your email address.',
                    code,
                }),
        },

        PASSWORD_RESET: {
            subject: 'Reset your Playlists password',
            generateHtml: (code) =>
                generateCodeEmail({
                    heading: 'Reset your password',
                    message: 'Enter the code below to reset your Playlists password.',
                    code,
                }),
        },

        LOGIN: {
            subject: 'Your Playlists login code',
            generateHtml: (code) =>
                generateCodeEmail({
                    heading: 'Sign in to Playlists',
                    message: 'Enter the code below to finish signing in.',
                    code,
                }),
        },
    };

    return { sendCodeEmail };
};
