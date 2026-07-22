export const sendMailMock = jest.fn();

jest.mock('nodemailer', () => ({
    createTransport: () => ({
        sendMail: sendMailMock,
    }),
}));
