import { logger } from 'shared/logger/logger';
import { VideoMetadata } from '../types';
import { load } from 'cheerio';
import { ALLOWED_DOMAINS } from '../constants';
import { getIdentityFromUrl } from '../utils/videoUrl';
import { AppError, BadGatewayError, NotFoundError } from 'shared/errors/errors';

export type VideoMetadataService = ReturnType<typeof createVideoMetadataService>;
export const createVideoMetadataService = () => {
    const extractMetadata = (html: string): VideoMetadata => {
        const $ = load(html);
        const getMeta = (property: string): string | undefined => {
            return $(`meta[property="${property}"]`).attr('content') ?? undefined;
        };
        return {
            title: getMeta('og:title'),
            thumbnail: getMeta('og:image'),
            description: getMeta('og:description'),
        };
        //TODO: tiktok
    };

    const getExternalData = async (
        url: string,
    ): Promise<{ url: string; platformId?: string; metadata?: VideoMetadata } | undefined> => {
        const parsedUrl = new URL(url);
        if (!ALLOWED_DOMAINS.has(parsedUrl.hostname)) {
            return undefined;
        }
        try {
            const result = await fetchHTML(url);
            if (!result.platformId) {
                return undefined;
            }
            return {
                url: result.resolvedUrl,
                platformId: result.platformId,
                metadata: extractMetadata(result.html),
            };
        } catch (error) {
            logger.error({ error }, 'Failed to fetch video metadata');
            if (error instanceof AppError) {
                throw error;
            }
        }
    };

    const checkUrlAllowed = (url: string) => {
        const identity = getIdentityFromUrl(url.toString());

        if (!identity) {
            throw new Error('Redirect to disallowed host');
        }
        return identity;
    };

    const getCanonicalUrl = (url: string): string => {
        const parsedUrl = new URL(url);

        parsedUrl.search = '';
        parsedUrl.hash = '';

        return parsedUrl.toString();
    };

    const MAX_REDIRECTS = 3;

    const fetchHTML = async (
        url: string,
    ): Promise<{ html: string; resolvedUrl: string; platformId: string | undefined }> => {
        let currentUrl = url;
        let platformId = undefined;

        for (let i = 0; i <= MAX_REDIRECTS; i++) {
            const response = await fetch(currentUrl, {
                signal: AbortSignal.timeout(5000),
                redirect: 'manual',
            });

            const location = response.headers.get('location');

            if (response.status >= 300 && response.status < 400 && location) {
                const redirectUrl = new URL(location, currentUrl);

                currentUrl = redirectUrl.toString();
                checkUrlAllowed(currentUrl);
                continue;
            } else if (!response.ok) {
                if (response.status === 404) {
                    throw new NotFoundError('Video not found');
                }

                throw new BadGatewayError(
                    'Unable to fetch video metadata. Please try again later.',
                );
            }

            const identity = checkUrlAllowed(currentUrl);
            platformId = identity.platformId;

            return {
                html: await response.text(),
                resolvedUrl: getCanonicalUrl(currentUrl),
                platformId: platformId,
            };
        }

        throw new Error('Too many redirects');
    };

    return { getExternalData };
};
