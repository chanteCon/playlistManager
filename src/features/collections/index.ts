import { PrismaClient } from '@prisma/client';
import { PlaylistService } from 'features/playlist/services/playlistService';
import { createCollectionsRepo } from './collectionsRepo';
import { createCollectionService } from 'features/collections/collectionsService';
import { createCollectionController } from './collectionsController';
import { createCollectionRoutes } from './collectionsRoutes';
import { RequestHandler } from 'express';

export const createCollectionsFeature = ({
    db,
    playlistService,
    authUserLimiter,
}: {
    db: PrismaClient;
    playlistService: PlaylistService;
    authUserLimiter: RequestHandler;
}) => {
    const collectionsRepo = createCollectionsRepo({ db });
    const collectionsService = createCollectionService({ collectionsRepo, playlistService });
    const collectionController = createCollectionController(collectionsService);
    return { routes: createCollectionRoutes({ collectionController, authUserLimiter }) };
};
