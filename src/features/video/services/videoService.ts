import { BadInputError, NotFoundError } from 'shared/errors/errors';
import { VideoRepo } from '../repos/videoRepo';
import { Platform, PlatformIdentity, VideoMetadata, VideoWithSource } from '../types';
import { handleNotFoundError } from 'database/prisma/repoError';
import { VideoMetadataService } from './videoMetadataService';

const VIDEO_DATA_EXP_MS = 30 * 24 * 60 * 60 * 1000;
const TIKTOK_ID_REGEX = /^\d{10,25}$/;
const TIKTOK_SHORT_ID_REGEX = /^[A-Za-z0-9]+$/;
const TIKTOK_USERNAME_REGEX = /^[A-Za-z0-9._]+$/;
const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const TIKTOK_HOSTS = new Set([
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
]);

type VideoServiceDeps = { videoRepo: VideoRepo; videoMetadataService: VideoMetadataService };

export type VideoService = ReturnType<typeof createVideoService>;

export const createVideoService = ({ videoRepo, videoMetadataService }: VideoServiceDeps) => {
    /// Internal ////////////////////////////////////

    const _isFresh = (video: VideoWithSource) => {
        if (!video.source) {
            return false;
        }
        const updatedAt = new Date(video.source.updatedAt).getTime();
        return Date.now() - updatedAt < VIDEO_DATA_EXP_MS;
    };

    const _updateIfStale = async (video: VideoWithSource) => {
        if (!video.source || _isFresh(video)) {
            return video;
        }
        try {
            const newData = await videoMetadataService.getExternalData(video.url);
            if (!newData) {
                return video;
            }
            const updatedSource = await videoRepo.updateSourceData(video.source.id, newData);
            return { ...video, source: updatedSource };
        } catch (error) {
            handleNotFoundError(error, 'video not found');
            throw error;
        }
    };

    type ParsedURLData = {
        url: string;
        platform?: Platform;
        platformId?: string;
    };

    const _getIdentityFromUrl = (url: string): ParsedURLData | undefined => {
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
        if (
            hostname === 'www.tiktok.com' ||
            hostname === 'tiktok.com' ||
            hostname === 'm.tiktok.com'
        ) {
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
            {
                platformId = parsedUrl.pathname.split('/')[1];
            }
            if (platformId) {
                url = `https://${hostname}/${platformId}/`;
            }
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

    /// External /////////////////////////////////////

    const addFromUrl = async (url: string): Promise<VideoWithSource> => {
        const normalisedURLData = _getIdentityFromUrl(url);
        const storedUrl = normalisedURLData?.url || url;
        const existing = await videoRepo.findByUrl(storedUrl);
        if (existing) {
            return existing;
        }
        let metadata: VideoMetadata | undefined = undefined;
        let platformIdentity: PlatformIdentity | undefined = undefined;
        const { platform, platformId } = normalisedURLData ?? {};
        if (platform && platformId) {
            metadata = await videoMetadataService.getExternalData(storedUrl);
            platformIdentity = { platform, platformId };
        }
        return await videoRepo.ensureExists({
            url: storedUrl,
            metadata,
            platformIdentity,
        });
    };

    const getFreshById = async (id: string): Promise<VideoWithSource> => {
        const video = await findById(id);
        return await _updateIfStale(video);
    };

    const findById = async (id: string): Promise<VideoWithSource> => {
        const video = await videoRepo.findById(id);
        if (!video) {
            throw new NotFoundError('video not found');
        }
        return video;
    };

    return { addFromUrl, findById, getFreshById };
};
