import { AuthRequest } from 'features/auth/types';
import { PlaylistService } from '../services/playlistService';
import { PlaylistCreateData, PlaylistUpdateInput } from '../types';
import { Response } from 'express';
import { canSendResponse } from 'shared/helper';

export const createPlaylistController = (playlistService: PlaylistService) => {
    const getAllUserPlaylists = async (req: AuthRequest, res: Response) => {
        const playlists = await playlistService.getUserPlaylists(req.user!.id);
        return res.status(200).json({ playlists });
    };

    const createPlaylist = async (
        req: AuthRequest<any, any, PlaylistCreateData>,
        res: Response,
    ) => {
        const userId = req.user!.id;
        const playlist = await playlistService.create(userId, req.body);
        return res.status(201).json({ playlist });
    };

    const getPlaylist = async (req: AuthRequest<{ playlistId: string }>, res: Response) => {
        const { playlistId } = req.params;
        const userId = req.user!.id;
        const playlist = await playlistService.getPlaylistById(userId, playlistId);
        return res.status(200).json({ playlist });
    };

    const updatePlaylist = async (
        req: AuthRequest<{ playlistId: string }, any, PlaylistUpdateInput>,
        res: Response,
    ) => {
        const { playlistId } = req.params;
        const userId = req.user!.id;
        const playlist = await playlistService.update(userId, playlistId, req.body);
        return res.status(200).json({ playlist });
    };

    const deletePlaylist = async (req: AuthRequest<{ playlistId: string }>, res: Response) => {
        const { playlistId } = req.params;
        const userId = req.user!.id;
        await playlistService.remove(userId, playlistId);
        if (canSendResponse(res)) {
            return res.status(204).send();
        }
    };

    return { createPlaylist, getPlaylist, getAllUserPlaylists, updatePlaylist, deletePlaylist };
};
