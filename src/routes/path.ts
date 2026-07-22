export const API_PREFIX = '/api';

export const authPaths = {
    base: `${API_PREFIX}/auth`,
    register: `${API_PREFIX}/auth/register`,
    verify: `${API_PREFIX}/auth/verify`,
    verificationCodeReq: `${API_PREFIX}/auth/verification-code-request`,
    login: `${API_PREFIX}/auth/login`,
    loginMfa: `${API_PREFIX}/auth/login/mfa`,
    logout: `${API_PREFIX}/auth/logout`,
    refresh: `${API_PREFIX}/auth/refresh`,
    resetPassword: `${API_PREFIX}/auth/password-reset`,
    resetPasswordReq: `${API_PREFIX}/auth/password-reset-request`,
};

export const userPaths = {
    base: `${API_PREFIX}/users`,
    me: `${API_PREFIX}/users/me`,
    updateEmail: `${API_PREFIX}/users/update-email`,
};
