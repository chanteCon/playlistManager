import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export const hashString = (input: string): string => {
    return crypto.createHash('sha256').update(input).digest('hex');
};
export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, ROUNDS);
};

export const generateRandomString = (length: number): string => {
    return crypto.randomBytes(length).toString('hex');
};

export const comparePassword = async (plainString: string, hash: string) => {
    return await bcrypt.compare(plainString, hash);
};
