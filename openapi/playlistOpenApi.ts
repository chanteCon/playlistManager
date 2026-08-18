import * as playlistSchemas from '../src/features/playlist/schemas';
import { ZodOpenApiComponentsObject, ZodOpenApiSecuritySchemeObject } from 'zod-openapi';
import { successResponse, errorResponse } from './commonSchemas';
import { z } from 'zod';

const id = '00000000-0000-0000-0000-000000000000';

export const authHeader: Record<string, ZodOpenApiSecuritySchemeObject> = {
    BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token in Authorization header, e.g., "Bearer <token>"',
    },
};

const components: ZodOpenApiComponentsObject = {
    securitySchemes: authHeader,
};

/*
 * DTOs
 */

const playlistVideoDTOSchema = z.object({
    id: z.uuid(),
    title: z.string(),
    description: z.string().optional(),
    thumbnail: z.string().optional(),
    url: z.string(),
    platform: z.string().nullable().optional(),
    platformId: z.string().nullable().optional(),
    render: z.boolean(),
});

const playlistDTOSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    videos: z.array(playlistVideoDTOSchema),
});

const playlistResponseSchema = z.object({
    playlist: z.object({
        id: z.uuid(),
        userId: z.uuid(),
        name: z.string(),
        description: z.string().nullable(),
    }),
});

const playlistsResponseSchema = z.object({
    playlists: z.array(
        z.object({
            id: z.uuid(),
            userId: z.uuid(),
            name: z.string(),
            description: z.string().nullable(),
        }),
    ),
});

const playlistWithVideosResponseSchema = z.object({
    playlist: playlistDTOSchema,
});

const videoResponseSchema = z.object({
    video: playlistVideoDTOSchema,
});

const paths = {
    '/api/playlists/': {
        post: {
            summary: 'Create playlist',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: playlistSchemas.playlistCreateSchema,
                        example: {
                            name: 'My Playlist',
                            description: 'My playlist description',
                        },
                    },
                },
            },
            responses: {
                201: successResponse({
                    dataSchema: playlistResponseSchema,
                    data: {
                        playlist: {
                            id,
                            userId: id,
                            name: 'My Playlist',
                            description: null,
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                409: errorResponse({
                    message: 'You have another playlist with this name',
                }),
            },
        },

        get: {
            summary: 'Get all user playlists',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            responses: {
                200: successResponse({
                    dataSchema: playlistsResponseSchema,
                    data: {
                        playlists: [
                            {
                                id,
                                userId: id,
                                name: 'Playlist 1',
                                description: null,
                            },
                        ],
                    },
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
            },
        },
    },

    '/api/playlists/{id}': {
        get: {
            summary: 'Get playlist',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            parameters: [playlistSchemas.playlistIdField],
            responses: {
                200: successResponse({
                    dataSchema: playlistWithVideosResponseSchema,
                    data: {
                        playlist: {
                            id,
                            name: 'My Playlist',
                            description: 'My playlist description',
                            videos: [
                                {
                                    id,
                                    title: 'Test Video',
                                    description: 'Test description',
                                    thumbnail: 'https://example.com/thumbnail.jpg',
                                    url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
                                    platform: 'youtube',
                                    platformId: 'zzzzzzzzzzz',
                                    render: false,
                                },
                            ],
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Playlist not found',
                }),
            },
        },

        patch: {
            summary: 'Update playlist',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            parameters: [playlistSchemas.playlistIdField],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: playlistSchemas.playlistUpdateSchema,
                        description: 'At least one or name or description must be provided.',
                        example: {
                            name: 'Updated Playlist',
                            description: 'Updated description',
                        },
                    },
                },
            },
            responses: {
                200: successResponse({
                    dataSchema: playlistResponseSchema,
                    data: {
                        playlist: {
                            id,
                            userId: id,
                            name: 'Updated Playlist',
                            description: 'Updated description',
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Playlist not found',
                }),
                409: errorResponse({
                    message: 'You have another playlist with this name',
                }),
            },
        },

        delete: {
            summary: 'Delete playlist',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            parameters: [playlistSchemas.playlistIdField],
            responses: {
                204: {
                    description: 'Playlist deleted successfully',
                },
                400: errorResponse({
                    message: 'Invalid Input',
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Playlist not found',
                }),
            },
        },
    },

    '/api/playlists/{id}/videos': {
        post: {
            summary: 'Add video to playlist',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            parameters: [playlistSchemas.playlistIdField],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: playlistSchemas.videoUrlSchema,
                        example: {
                            url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
                        },
                    },
                },
            },
            responses: {
                201: successResponse({
                    dataSchema: videoResponseSchema,
                    data: {
                        video: {
                            id,
                            title: 'Test Video',
                            description: 'Test description',
                            thumbnail: 'https://example.com/thumbnail.jpg',
                            url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
                            platform: 'youtube',
                            platformId: 'zzzzzzzzzzz',
                            render: false,
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid input or unable to process video URL',
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Playlist or Viideo not found',
                }),
                409: errorResponse({
                    message: 'You have already added this video to the playlist',
                }),
                502: errorResponse({
                    message: 'Unable to fetch video metadata. Please try again later.',
                }),
            },
        },
    },

    '/api/playlists/{id}/videos/{playlistVideoId}': {
        patch: {
            summary: 'Update playlist video',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            parameters: [playlistSchemas.playlistIdField, playlistSchemas.videoIdField],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: playlistSchemas.updateVideoSchema,
                        description: 'At least one of title or description must be provided.',
                        example: {
                            title: 'Updated title',
                            description: 'Updated description',
                        },
                    },
                },
            },
            responses: {
                200: successResponse({
                    dataSchema: videoResponseSchema,
                    data: {
                        video: {
                            id,
                            title: 'Updated title',
                            description: 'Test description',
                            thumbnail: 'https://example.com/thumbnail.jpg',
                            url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
                            platform: 'youtube',
                            platformId: 'zzzzzzzzzzz',
                            render: false,
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Playlist not found',
                }),
            },
        },

        delete: {
            summary: 'Remove video from playlist',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            parameters: [playlistSchemas.playlistIdField, playlistSchemas.videoIdField],
            responses: {
                204: {
                    description: 'Video removed from playlist successfully',
                },
                400: errorResponse({
                    message: 'Invalid Input',
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Playlist not found',
                }),
            },
        },
    },
};

export const playlistApiPaths = {
    openapi: '3.1.0',
    info: {
        title: 'Playlist API',
        version: '1.0.0',
    },
    components,
    paths,
};
