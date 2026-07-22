import { Response } from 'express';

export const expectMockResponse = ({
    mockRes,
    status = 200,
    json = true,
    data,
    message,
}: {
    mockRes: Partial<Response>;
    status?: number;
    json?: boolean;
    data?: any;
    message?: string;
}) => {
    expect(mockRes.status).toHaveBeenCalledWith(status);

    if (json) {
        let expected = {};
        if (data !== undefined) expected = data;

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining(expected));
        if (message !== undefined) mockRes.locals!.message = message;
    } else {
        expect(mockRes.json).not.toHaveBeenCalled();
    }
};

const REFRESH_TOKEN_EXPIRES_IN: string = process.env.REFRESH_TOKEN_EXPIRES_IN!;
const COOKIE_EXPIRY_MS = parseInt(REFRESH_TOKEN_EXPIRES_IN) * 1000;
export const expectMockCookie = ({
    mockRes,
    path = '/',
    name,
    value,
}: {
    mockRes: Response;
    path?: string;
    name: string;
    value: string;
}) => {
    expect(mockRes.cookie).toHaveBeenCalledWith(name, value, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path,
        maxAge: COOKIE_EXPIRY_MS,
    });
};

export const expectMockCookieCleared = ({
    mockRes,
    path = '/',
    name,
}: {
    mockRes: Response;
    path?: string;
    name: string;
}) => {
    expect(mockRes.clearCookie).toHaveBeenCalledWith(name, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path,
    });
};
