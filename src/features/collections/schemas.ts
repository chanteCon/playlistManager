import { z } from 'zod';

export const collectionNameField = z
    .string()
    .trim()
    .min(1, 'Collection name is required')
    .max(100, 'Collection name must be 100 characters or less');

export const createCollectionSchema = z
    .object({
        name: collectionNameField,
    })
    .strip();

export const updateCollectionSchema = z
    .object({
        name: collectionNameField.optional(),
        cover: z.uuid().nullable().optional(),
    })
    .strip()
    .refine((data) => data.name !== undefined || data.cover !== undefined, {
        message: 'At least one field must be provided',
    });
export const collectionIdField = z.uuid().meta({
    param: {
        name: 'id',
        in: 'path',
    },
});

export const playlistIdField = z.uuid().meta({
    param: {
        name: 'playlistId',
        in: 'path',
    },
});

export const collectionIdParamsSchema = z
    .object({
        id: collectionIdField,
    })
    .strip();

export const collectionPlaylistParamsSchema = z
    .object({
        id: collectionIdField,
        playlistId: playlistIdField,
    })
    .strip();
