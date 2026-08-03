import { BadInputError } from 'shared/errors/errors';
import { Platform } from '../types';
import {
    TIKTOK_HOSTS,
    TIKTOK_ID_REGEX,
    TIKTOK_SHORT_ID_REGEX,
    TIKTOK_USERNAME_REGEX,
    YOUTUBE_HOSTS,
    YOUTUBE_ID_REGEX,
} from '../constants';

type ParsedURLData = {
    platform: Platform;
    url: string;
    platformId?: string;
};

const _parseYoutubeUrl = (parsedUrl: URL, hostname: string): ParsedURLData | undefined => {
    let platformId: string | undefined;

    if (hostname === 'youtu.be') {
        platformId = parsedUrl.pathname.split('/')[1] || undefined;
    }

    if (
        hostname === 'www.youtube.com' ||
        hostname === 'm.youtube.com' ||
        hostname === 'youtube.com'
    ) {
        const parts = parsedUrl.pathname.split('/');

        const shortsIndex = parts.indexOf('shorts');

        if (shortsIndex !== -1) {
            platformId = parts[shortsIndex + 1] || undefined;
        } else {
            platformId = parsedUrl.searchParams.get('v') ?? undefined;
        }
    }

    if (!platformId) {
        return undefined;
    }

    if (!YOUTUBE_ID_REGEX.test(platformId)) {
        throw new BadInputError('url format not supported');
    }

    return {
        platform: 'youtube',
        platformId,
        url: `https://www.youtube.com/watch?v=${platformId}`,
    };
};

const _parseTiktokUrl = (parsedUrl: URL, hostname: string): ParsedURLData | undefined => {
    let platformId: string | undefined;
    let url: string | undefined;
    if (hostname === 'www.tiktok.com' || hostname === 'tiktok.com' || hostname === 'm.tiktok.com') {
        const parts = parsedUrl.pathname.split('/').filter(Boolean);
        const videoIndex = parts.indexOf('video');
        if (videoIndex !== -1) {
            platformId = parts[videoIndex + 1];
            if (platformId && parts[0]?.startsWith('@')) {
                const username = parts[0].slice(1);
                if (!TIKTOK_USERNAME_REGEX.test(username)) {
                    throw new BadInputError('url format not supported');
                }
                url = `https://www.tiktok.com/@${username}/video/${platformId}`;
            }
        }
    }

    if (hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com') {
        return {
            // These require redirects to resolve full url and get platform identity
            platform: 'tiktok',
            url: parsedUrl.toString(),
            platformId: undefined,
        };
    }

    if (!platformId || !url) {
        return undefined;
    }

    if (!TIKTOK_ID_REGEX.test(platformId) && !TIKTOK_SHORT_ID_REGEX.test(platformId)) {
        throw new BadInputError('url format not supported');
    }

    return {
        platform: 'tiktok',
        platformId,
        url,
    };
};

export const getIdentityFromUrl = (url: string): ParsedURLData | undefined => {
    let parsedUrl: URL;

    try {
        parsedUrl = new URL(url);
    } catch {
        throw new BadInputError('url format not supported');
    }
    const hostname = parsedUrl.hostname;
    if (YOUTUBE_HOSTS.has(hostname)) {
        return _parseYoutubeUrl(parsedUrl, hostname);
    }
    if (TIKTOK_HOSTS.has(hostname)) {
        return _parseTiktokUrl(parsedUrl, hostname);
    }
    return undefined;
};
