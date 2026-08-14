import { PrismaClient } from '@prisma/client';
import { RequestHandler } from 'express';
import { createPlaylistRepo } from './repos/playlistRepo';
import { createVideoRepo } from 'features/video/repos/videoRepo';
import { createVideoMetadataService } from 'features/video/services/videoMetadataService';
import { createVideoService } from 'features/video/services/videoService';
import { createPlaylistVideoRepo } from './repos/playlistVideoRepo';
import { createPlaylistService } from './services/playlistService';
import { createPlaylistController } from './controllers/playlistController';
import { createPlaylistRoutes } from './playlistRoutes';
import { createPlaylistVideoController } from './controllers/playlistVideoController';

type PlaylistFeatureDeps = {
    db: PrismaClient;
    authMiddleware: RequestHandler;
};

export const createPlaylistFeature = ({ db, authMiddleware }: PlaylistFeatureDeps) => {
    // video feature
    const videoRepo = createVideoRepo({ db });
    const videoMetadataService = createVideoMetadataService();
    const videoService = createVideoService({ videoRepo, videoMetadataService });

    const playlistRepo = createPlaylistRepo({ db });
    const playlistVideoRepo = createPlaylistVideoRepo({ db });
    const playlistService = createPlaylistService({
        playlistRepo,
        playlistVideoRepo,
        videoService,
    });

    const playlistController = createPlaylistController(playlistService);
    const playlistVideoController = createPlaylistVideoController(playlistService);
    return {
        routes: createPlaylistRoutes({
            playlistController,
            playlistVideoController,
            authMiddleware,
        }),
    };
};
