import nodemailer from 'nodemailer';

export const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST!,
    port: Number(process.env.EMAIL_PORT!),
    secure: false,
    auth: process.env.EMAIL_USER
        ? {
              user: process.env.EMAIL_USER!,
              pass: process.env.EMAIL_PASS!,
          }
        : undefined,
});
