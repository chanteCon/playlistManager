import { NotFoundError } from 'shared/errors/errors';
import { VideoRepo } from '../repos/videoRepo';
import { VideoMetadata, VideoWithSource } from '../types';
import { handleNotFoundError } from 'database/prisma/repoError';
import { VideoMetadataService } from './videoMetadataService';
import { VIDEO_DATA_EXP_MS } from '../constants';
import { getIdentityFromUrl } from '../utils/videoUrl';
import { VideoSource } from '@prisma/client';

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
            const result = await videoMetadataService.getExternalData(video.source.canonicalUrl);
            if (!result || !result.metadata) {
                await videoRepo.touchSource(video.source.id);
                return video;
            }
            const updatedSource = await videoRepo.updateSourceData(
                video.source.id,
                result.url,
                result.metadata,
            );
            return { ...video, source: updatedSource };
        } catch (error) {
            handleNotFoundError(error, 'video not found');
            throw error;
        }
    };

    /// External /////////////////////////////////////

    const addFromUrl = async (url: string): Promise<VideoWithSource> => {
        let existingSource: VideoSource | null = null;
        let metadata: VideoMetadata | undefined = undefined;
        let canonicalUrl: string | undefined;

        const normalisedURLData = getIdentityFromUrl(url);

        const existing = await videoRepo.findByUrl(normalisedURLData?.url ?? url);
        if (existing) {
            return existing;
        }

        // eslint-disable-next-line prefer-const
        let { platform, platformId } = normalisedURLData ?? {};

        if (platform && platformId) {
            // see if source already exsits
            existingSource = await videoRepo.findByPlatformIdentity({ platform, platformId });
            let rest: Partial<VideoSource>;
            ({ canonicalUrl, ...rest } = existingSource ?? {});
            metadata = {
                title: rest.title,
                description: rest.description,
                thumbnail: rest.thumbnail,
            };
        }

        if (normalisedURLData && !existingSource && platform) {
            // Otherwise need to fetch the canonical url and source data
            const result = await videoMetadataService.getExternalData(normalisedURLData.url);
            if (result) {
                metadata = result.metadata;
                canonicalUrl = result.url;
                platformId = result.platformId ?? platformId;
            }
        }
        const platformIdentity = platform && platformId ? { platform, platformId } : undefined;
        return await videoRepo.ensureExists({
            url,
            canonicalUrl,
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
