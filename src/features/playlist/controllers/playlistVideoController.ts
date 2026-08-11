import { AuthRequest } from 'features/auth/types';
import { PlaylistService } from '../services/playlistService';
import { Response } from 'express';
import { PlaylistVideoReference, PlaylistVideoUpdateInput } from '../types';
import { canSendResponse } from 'shared/helper';

export const createPlaylistVideoController = (playlistService: PlaylistService) => {
    const addVideo = async (
        req: AuthRequest<{ playlistId: string }, any, { url: string }>,
        res: Response,
    ) => {
        const userId = req.user!.id;
        const { playlistId } = req.params;
        const video = await playlistService.addVideo(userId, { playlistId, url: req.body.url });
        return res.status(201).json({ video });
    };
    const updateVideo = async (
        req: AuthRequest<PlaylistVideoReference, any, PlaylistVideoUpdateInput>,
        res: Response,
    ) => {
        const userId = req.user!.id;
        const { playlistId, videoId } = req.params;
        const video = await playlistService.updateVideo(userId, {
            playlistId,
            playlistVideoId: videoId,
            data: req.body,
        });
        return res.status(200).json({ video });
    };
    const deleteVideo = async (req: AuthRequest<PlaylistVideoReference>, res: Response) => {
        const { playlistId, videoId } = req.params;
        const userId = req.user!.id;
        await playlistService.removeVideo(userId, { playlistId, playlistVideoId: videoId });
        if (canSendResponse(res)) {
            return res.status(204).send();
        }
    };

    return { addVideo, updateVideo, deleteVideo };
};
