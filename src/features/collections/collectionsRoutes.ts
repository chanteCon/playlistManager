import { RequestHandler, Router } from 'express';

import { validate } from 'middleware/validationMiddleware';

import { authMiddleware } from 'features/video/authMiddleware';

import { CollectionController } from './collectionsController';

import {
    collectionIdParamsSchema,
    collectionPlaylistParamsSchema,
    createCollectionSchema,
    updateCollectionSchema,
} from './schemas';

type CollectionRoutesDeps = {
    collectionController: CollectionController;
    authUserLimiter: RequestHandler;
};

export const createCollectionRoutes = ({
    collectionController,
    authUserLimiter,
}: CollectionRoutesDeps) => {
    const router = Router();

    router.use(authMiddleware);
    router.use(authUserLimiter);

    router.get('/', collectionController.getCollections);

    router.post('/', validate(createCollectionSchema), collectionController.createCollection);

    router.get(
        '/:id',
        validate(collectionIdParamsSchema, 'params'),
        collectionController.getCollection,
    );

    router.patch(
        '/:id',
        validate(collectionIdParamsSchema, 'params'),
        validate(updateCollectionSchema),
        collectionController.updateCollection,
    );

    router.delete(
        '/:id',
        validate(collectionIdParamsSchema, 'params'),
        collectionController.deleteCollection,
    );

    router.post(
        '/:id/playlists/:playlistId',
        validate(collectionPlaylistParamsSchema, 'params'),
        collectionController.addPlaylist,
    );

    router.delete(
        '/:id/playlists/:playlistId',
        validate(collectionPlaylistParamsSchema, 'params'),
        collectionController.deletePlaylist,
    );

    return router;
};
