import { logger } from 'shared/logger/logger';

import { PlatformIdentity, VideoMetadata } from '../types';

import { load } from 'cheerio';

import { ALLOWED_DOMAINS, YOUTUBE_API_URL } from '../constants';

import { getIdentityFromUrl } from '../utils/videoUrl';

import { BadGatewayError, BadInputError, NotFoundError } from 'shared/errors/errors';

const MAX_HTML_SIZE = 2 * 1024 * 1024; // 2 MiB

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
        // TODO: tiktok
    };

    const getYouTubeMetadata = async (videoId: string): Promise<VideoMetadata> => {
        const apiKey = process.env.YOUTUBE_API_KEY;

        if (!apiKey) {
            logger.error('YOUTUBE_API_KEY is not configured');
            throw new BadGatewayError('Unable to fetch video metadata. Please try again later.');
        }

        const params = new URLSearchParams({
            part: 'snippet',
            id: videoId,
            key: apiKey,
        });

        try {
            const response = await fetch(`${YOUTUBE_API_URL}?${params}`, {
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                logger.error({ status: response.status, videoId }, 'YouTube API request failed');

                throw new BadGatewayError(
                    'Unable to fetch video metadata. Please try again later.',
                );
            }

            const data = await response.json();

            const video = data.items?.[0];

            if (!video) {
                throw new NotFoundError('Video not found', {
                    video: ['Video not found'],
                });
            }

            const snippet = video.snippet;

            return {
                title: snippet.title,
                description: snippet.description,
                thumbnail:
                    snippet.thumbnails.maxres?.url ??
                    snippet.thumbnails.high?.url ??
                    snippet.thumbnails.medium?.url ??
                    snippet.thumbnails.default?.url,
            };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof BadGatewayError) {
                throw error;
            }

            logger.error({ error, videoId }, 'Failed to fetch YouTube video metadata');

            throw new BadGatewayError('Unable to fetch video metadata. Please try again later.');
        }
    };

    const getExternalData = async (
        url: string,
        platformIdentity?: PlatformIdentity,
    ): Promise<{ url: string; platformId?: string; metadata?: VideoMetadata } | undefined> => {
        const parsedUrl = new URL(url);
        try {
            if (!ALLOWED_DOMAINS.has(parsedUrl.hostname)) {
                return undefined;
            }

            if (
                platformIdentity &&
                platformIdentity.platform === 'youtube' &&
                platformIdentity.platformId
            ) {
                const metadata = await getYouTubeMetadata(platformIdentity.platformId);

                return {
                    url: `https://www.youtube.com/watch?v=${platformIdentity.platformId}`,
                    platformId: platformIdentity.platformId,
                    metadata,
                };
            } else {
                const result = await fetchHTML(url);

                const resolvedIdentity = getIdentityFromUrl(result.resolvedUrl);

                if (resolvedIdentity?.platform === 'youtube' && resolvedIdentity.platformId) {
                    const metadata = await getYouTubeMetadata(resolvedIdentity.platformId);

                    return {
                        url: resolvedIdentity.url,
                        platformId: resolvedIdentity.platformId,
                        metadata,
                    };
                }

                if (!result.platformId) {
                    return undefined;
                }

                const metadata = extractMetadata(result.html);

                return {
                    url: result.resolvedUrl,
                    platformId: result.platformId,
                    metadata,
                };
            }
        } catch (error) {
            logger.error({ error, url }, 'Failed to fetch video metadata');
            throw error;
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
    ): Promise<{
        html: string;
        resolvedUrl: string;
        platformId: string | undefined;
    }> => {
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
                    throw new NotFoundError('Video not found', {
                        video: ['Video not found'],
                    });
                }

                throw new BadGatewayError(
                    'Unable to fetch video metadata. Please try again later.',
                );
            }

            const identity = checkUrlAllowed(currentUrl);
            platformId = identity.platformId;

            return {
                html: await readResponse(response),
                resolvedUrl: getCanonicalUrl(currentUrl),
                platformId,
            };
        }

        throw new BadInputError('Invalid input', {
            url: ['Too many redirects'],
        });
    };

    const readResponse = async (response: Response): Promise<string> => {
        const contentLength = response.headers.get('content-length');

        if (contentLength && Number(contentLength) > MAX_HTML_SIZE) {
            throw new BadInputError('Invalid input', {
                url: ['Unable to process video URL'],
            });
        }

        if (!response.body) {
            throw new BadInputError('Invalid input', {
                url: ['Unable to process video URL'],
            });
        }

        const decoder = new TextDecoder();
        const chunks: string[] = [];
        let size = 0;

        for await (const chunk of response.body) {
            size += chunk.byteLength;

            if (size > MAX_HTML_SIZE) {
                throw new BadInputError('Invalid input', {
                    url: ['Unable to process video URL'],
                });
            }

            chunks.push(decoder.decode(chunk, { stream: true }));
        }

        chunks.push(decoder.decode());

        return chunks.join('');
    };

    return { getExternalData };
};
