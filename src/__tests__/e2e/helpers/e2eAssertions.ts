import { AppError } from 'shared/errors/errors';
import { Response } from 'supertest';
import { logger } from 'shared/logger/logger';
import { extractCookie } from './e2eTestHelpers';

export const expectResError = ({
    res,
    error,
    mockLogger,
    errors,
}: {
    res: Response;
    error: AppError;
    mockLogger: jest.Mocked<typeof logger>;
    errors?: string[];
}) => {
    expect(res.status).toEqual(error.status);
    expect(res.body.message).toBeDefined();
    const resMessage = res.body.message;
    expect(resMessage).toContain(error.message);
    const loggedError = mockLogger.error.mock.calls.at(-1)?.[0] as AppError;
    expect(loggedError.message).toContain(error.message);
    expect(loggedError.status).toEqual(error.status);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBe(null);
    if (errors) {
        expect(res.body.errors).not.toBeNull();
    }
};

export const expectWrappedResponse = ({
    res,
    message,
    data,
    status = 200,
}: {
    res: Response;
    message?: string;
    data?: any;
    status?: number;
}) => {
    expect(res.status).toEqual(status);
    const jsonData = res.body;
    expect(jsonData.success).toEqual(true);
    if (message) expect(jsonData.message).toEqual(message);
    if (data) expect(jsonData.data).toEqual(data);
};

export const expectCookie = ({ name, res }: { name: string; res: Response }) => {
    const cookie = extractCookie({ res, name });
    expect(cookie).toBeDefined();
};

export const expectCookieCleared = ({ name, res }: { name: string; res: Response }) => {
    const cookie = extractCookie({ res, name });
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
};
