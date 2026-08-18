import { RequestHandler, Router } from 'express';
import { PlaylistController } from './controllers/playlistController';
import { PlaylistVideoController } from './controllers/playlistVideoController';
import { validate } from 'middleware/validationMiddleware';
import {
    playlistCreateSchema,
    playlistIdSchema,
    playlistUpdateSchema,
    playlistVideoRefSchema,
    updateVideoSchema,
    videoUrlSchema,
} from './schemas';
import { authMiddleware } from 'features/video/authMiddleware';

type PlaylistRoutesDeps = {
    playlistController: PlaylistController;
    playlistVideoController: PlaylistVideoController;
    authUserLimiter: RequestHandler;
};

export const createPlaylistRoutes = ({
    playlistController,
    playlistVideoController,
    authUserLimiter,
}: PlaylistRoutesDeps) => {
    const router = Router();
    router.use(authMiddleware);
    router.use(authUserLimiter);
    // Playlist
    router.post('/', validate(playlistCreateSchema), playlistController.createPlaylist);

    router.get('/', playlistController.getAllUserPlaylists);

    router.get('/:id', validate(playlistIdSchema, 'params'), playlistController.getPlaylist);

    router.patch(
        '/:id',
        validate(playlistIdSchema, 'params'),
        validate(playlistUpdateSchema),
        playlistController.updatePlaylist,
    );

    router.delete('/:id', validate(playlistIdSchema, 'params'), playlistController.deletePlaylist);

    // Playlist videos
    router.post(
        '/:id/videos',
        validate(playlistIdSchema, 'params'),
        validate(videoUrlSchema),
        playlistVideoController.addVideo,
    );

    router.patch(
        '/:id/videos/:playlistVideoId',
        validate(playlistVideoRefSchema, 'params'),
        validate(updateVideoSchema),
        playlistVideoController.updateVideo,
    );

    router.delete(
        '/:id/videos/:playlistVideoId',
        validate(playlistVideoRefSchema, 'params'),
        playlistVideoController.deleteVideo,
    );
    return router;
};
