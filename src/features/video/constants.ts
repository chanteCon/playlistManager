export const VIDEO_DATA_EXP_MS = 30 * 24 * 60 * 60 * 1000;
export const TIKTOK_ID_REGEX = /^\d{10,25}$/;
export const TIKTOK_SHORT_ID_REGEX = /^[A-Za-z0-9]+$/;
export const TIKTOK_USERNAME_REGEX = /^[A-Za-z0-9._]+$/;
export const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
export const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
]);
export const TIKTOK_HOSTS = new Set([
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
]);

export const ALLOWED_DOMAINS = new Set([...YOUTUBE_HOSTS, ...TIKTOK_HOSTS]);
