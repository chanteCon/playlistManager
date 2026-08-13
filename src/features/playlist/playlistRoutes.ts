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
} from './schemas';

type PlaylistRoutesDeps = {
    playlistController: PlaylistController;
    playlistVideoController: PlaylistVideoController;
    authMiddleware: RequestHandler;
};

export const createPlaylistRoutes = ({
    playlistController,
    playlistVideoController,
    authMiddleware,
}: PlaylistRoutesDeps) => {
    const router = Router();
    router.use(authMiddleware);
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
};
