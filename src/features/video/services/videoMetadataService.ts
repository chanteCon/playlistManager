import { logger } from 'shared/logger/logger';
import { Platform, VideoMetadata } from '../types';
import { ALLOWED_DOMAINS, YOUTUBE_API_URL } from '../constants';
import { BadGatewayError, NotFoundError } from 'shared/errors/errors';

export type VideoMetadataService = ReturnType<typeof createVideoMetadataService>;

export const createVideoMetadataService = () => {
    const getTikTokMetadata = async (
        url: string,
    ): Promise<VideoMetadata & { platformId: string }> => {
        try {
            const response = await fetch(
                `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
                { signal: AbortSignal.timeout(5000) },
            );

            if (!response.ok) {
                if (response.status === 404) {
                    throw new NotFoundError('Video not found', {
                        video: ['Video not found'],
                    });
                }

                logger.error({ status: response.status, url }, 'TikTok oEmbed request failed');

                throw new BadGatewayError(
                    'Unable to fetch video metadata. Please try again later.',
                );
            }

            const data = await response.json();

            return {
                title: data.title,
                thumbnail: data.thumbnail_url,
                description: undefined,
                platformId: data.embed_product_id,
            };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof BadGatewayError) {
                throw error;
            }

            logger.error({ error, url }, 'Failed to fetch TikTok video metadata');

            throw new BadGatewayError('Unable to fetch video metadata. Please try again later.');
        }
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
        platformIdentity?: { platform: Platform; platformId: string | undefined },
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
            } else if (platformIdentity && platformIdentity?.platform === 'tiktok') {
                const metadata = await getTikTokMetadata(url);
                return {
                    url,
                    platformId: metadata?.platformId,
                    metadata,
                };
            }
            return undefined;
        } catch (error) {
            logger.error({ error, url }, 'Failed to fetch video metadata');
            throw error;
        }
    };

    return { getExternalData };
};
