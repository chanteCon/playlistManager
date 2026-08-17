export const API_PREFIX = '/api';

const AUTH_PATH = `${API_PREFIX}/auth`;

export const authPaths = {
    base: AUTH_PATH,
    register: `${AUTH_PATH}/register`,
    verify: `${AUTH_PATH}/verify`,
    verificationCodeReq: `${AUTH_PATH}/verification-code-request`,
    login: `${AUTH_PATH}/login`,
    loginMfa: `${AUTH_PATH}/login/mfa`,
    logout: `${AUTH_PATH}/logout`,
    refresh: `${AUTH_PATH}/refresh`,
    resetPassword: `${AUTH_PATH}/password-reset`,
    resetPasswordReq: `${AUTH_PATH}/password-reset-request`,
};

const USER_PATH = `${API_PREFIX}/users`;
export const userPaths = {
    base: USER_PATH,
    me: `${USER_PATH}/me`,
    updateEmail: `${USER_PATH}/update-email`,
};

const PLAYLIST_PATH = `${API_PREFIX}/playlists`;

export const playlistPaths = {
    base: PLAYLIST_PATH,
    id: (id: string) => `${PLAYLIST_PATH}/${id}`,
    videoBase: (playlistId: string) => `${PLAYLIST_PATH}/${playlistId}/videos`,
    videoId: (playlistId: string, playlistVideoId: string) =>
        `${PLAYLIST_PATH}/${playlistId}/videos/${playlistVideoId}`,
};
