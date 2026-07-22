import { logger } from 'shared/logger/logger';
import { VideoMetadata } from '../types';
import { load } from 'cheerio';

const ALLOWED_DOMAINS = new Set(['www.youtube.com', 'www.tiktok.com', 'vm.tiktok.com']);

export type VideoMetadataService = ReturnType<typeof createVideoMetadataService>;
export const createVideoMetadataService = () => {
    const extractOpenGraphData = (html: string): VideoMetadata => {
        const $ = load(html);
        const getMeta = (property: string): string | undefined => {
            return $(`meta[property="${property}"]`).attr('content') ?? undefined;
        };
        //  TODO only allow redirects to same hostname /platform already at
        // TODO fix to work with actual tiktok and youtube fields
        return {
            title: getMeta('og:title'),
            thumbnail: getMeta('og:image'),
            description: getMeta('og:description'),
        };
    };

    const getExternalData = async (url: string): Promise<VideoMetadata | undefined> => {
        const parsedUrl = new URL(url);
        if (!ALLOWED_DOMAINS.has(parsedUrl.hostname)) {
            return undefined;
        }
        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(5000),
                redirect: 'follow',
            });
            const html = await response.text();
            return extractOpenGraphData(html);
        } catch (error) {
            logger.error({ error }, 'Failed to fetch video metadata');
        }
    };

    return { getExternalData };
};
