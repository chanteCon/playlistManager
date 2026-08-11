import { z } from 'zod';

const nameField = z.string().trim().min(1).max(50);
const playlistNameField = nameField.meta({
    description:
        'Name must be between 1 and 50 characters. A user cannot have two playlists with the same name',
    example: 'Playlist one',
});
const videoTitleField = nameField.meta({
    description:
        'Title must be between 1 and 50 characters. Playlists cannot have two videos with the same custom title',
    example: 'Video one',
});

const desriptionField = z.string().trim().max(500).optional().meta({
    description: 'Description is optional and is between 0 and 500 characters',
    example: 'This is a description example.',
});

const playlistIdField = z.uuid().meta({
    description: 'The unique ID of the playlist',
    example: '00000000-0000-0000-0000-000000000000',
});
const videoIdField = z.uuid().meta({
    description: 'The unique ID of the playlist video',
    example: '00000000-0000-0000-0000-000000000000',
});

export const playlistCreateSchema = z
    .object({
        name: playlistNameField,
        description: desriptionField,
    })
    .strip();
export const playlistIdSchema = z.object({ playlistId: playlistIdField }).strip();
export const playlistUpdateSchema = z
    .object({
        name: playlistNameField.optional(),
        description: desriptionField,
    })
    .strip()
    .refine((data) => data.name !== undefined || data.description !== undefined, {
        message: 'Name or description field must be provided',
    });

export const videoUrlSchema = z
    .object({ url: z.url().meta({ description: 'The URL of the video to add to the playlist' }) })
    .strip();

export const updateVideoSchema = z
    .object({
        customTitle: videoTitleField.optional(),
        customDescription: desriptionField,
    })
    .strip()
    .refine((data) => data.customTitle !== undefined || data.customDescription !== undefined, {
        message: 'Title or description field must be provided',
    });

export const playlistVideoRefSchema = z
    .object({ playlistId: playlistIdField, videoId: videoIdField })
    .strip();
