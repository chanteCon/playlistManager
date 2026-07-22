import { Response, Request } from 'supertest';

export const extractCookie = ({ res, name }: { res: Response; name: string }) => {
    const cookies = res.headers['set-cookie'] ?? [];
    const cookiesArr = Array.isArray(cookies) ? cookies : [cookies];
    return cookiesArr.find((c) => c.startsWith(`${name}=`));
};

export const setAuthHeader = ({ req, accessToken }: { req: Request; accessToken: string }) => {
    return req.set('Authorization', `Bearer ${accessToken}`);
};

const extractCodeFromEmail = (email: any) => {
    return email.html.match(/<br>([a-z0-9]+)/i)?.[1];
};

export const getLastEmail = (sendMailMock: any) => {
    return sendMailMock.mock.calls.at(-1)?.[0];
};

export const extractCodeFromLastEmail = (sendMailMock: any) => {
    return extractCodeFromEmail(getLastEmail(sendMailMock));
};
