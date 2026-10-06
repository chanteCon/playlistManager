import { Response } from 'express';

import { AuthRequest } from 'features/auth/types';
import { CollectionService } from 'features/collections/collectionsService';
import { CollectionCreateData, CollectionPlaylistParams, CollectionUpdateData } from './types';

export type CollectionController = ReturnType<typeof createCollectionController>;

export const createCollectionController = (collectionService: CollectionService) => {
    const getCollections = async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const collections = await collectionService.getUserCollections(userId);
        return res.status(200).json({ collections });
    };
    const createCollection = async (
        req: AuthRequest<any, any, CollectionCreateData>,
        res: Response,
    ) => {
        const userId = req.user!.id;

        const collection = await collectionService.createCollection({
            userId,
            name: req.body.name,
        });

        return res.status(201).json({ collection });
    };

    const deleteCollection = async (req: AuthRequest<{ id: string }>, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        await collectionService.deleteCollection({
            userId,
            id,
        });

        return res.status(204).send();
    };

    const addPlaylist = async (req: AuthRequest<CollectionPlaylistParams>, res: Response) => {
        const userId = req.user!.id;
        const { id, playlistId } = req.params;

        const playlist = await collectionService.addPlaylist({
            userId,
            collectionId: id,
            playlistId,
        });
        return res.status(200).json({ playlist });
    };

    const deletePlaylist = async (req: AuthRequest<CollectionPlaylistParams>, res: Response) => {
        const userId = req.user!.id;
        const { id, playlistId } = req.params;

        await collectionService.deletePlaylist({
            userId,
            collectionId: id,
            playlistId,
        });
        return res.status(204).send();
    };

    const updateCollection = async (
        req: AuthRequest<{ id: string }, any, CollectionUpdateData>,
        res: Response,
    ) => {
        const userId = req.user!.id;
        const { id } = req.params;
        const { name, cover } = req.body;
        const collection = await collectionService.update({
            userId,
            id,
            name,
            cover,
        });

        return res.status(200).json({ collection });
    };

    const getCollection = async (req: AuthRequest<{ id: string }, any>, res: Response) => {
        const { id } = req.params;
        const collection = await collectionService.getById({ userId: req.user!.id, id });
        return res.status(200).json({ collection });
    };

    return {
        createCollection,
        deleteCollection,
        addPlaylist,
        deletePlaylist,
        updateCollection,
        getCollection,
        getCollections,
    };
};
