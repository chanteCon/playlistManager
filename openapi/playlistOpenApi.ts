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

export const playlistSearchField = {
    name: 'search',
    in: 'query',
    required: false,
    schema: {
        type: 'string',
    },
};

/*
 * DTOs
 */

const playlistVideoDTOSchema = z.object({
    id: z.uuid(),
    playlistId: z.uuid(),
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

const searchResponseSchema = z.object({
    results: z.object({
        playlists: z.array(
            z.object({
                id: z.uuid(),
                userId: z.uuid(),
                name: z.string(),
                description: z.string().nullable(),
            }),
        ),
        videos: z.array(playlistVideoDTOSchema),
    }),
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
                    message: 'Invalid input',
                    errors: {
                        name: ['Playlist name must be between 1 and 50 characters'],
                        description: ['Description must be 500 characters or fewer'],
                    },
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                409: errorResponse({
                    message: 'Could not add playlist',
                    errors: { name: ['You already have a playlist with this name'] },
                }),
            },
        },

        get: {
            summary: 'Get all user playlists',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            parameters: [playlistSearchField],
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

    '/api/playlists/search': {
        get: {
            summary: 'Search user library',
            tags: ['Playlist'],
            security: [{ BearerAuth: [] }],
            parameters: [playlistSearchField],
            responses: {
                200: successResponse({
                    dataSchema: searchResponseSchema,
                    data: {
                        results: {
                            playlists: [
                                {
                                    id,
                                    userId: id,
                                    name: 'Music Favourites',
                                    description: 'My favourite songs',
                                },
                            ],
                            videos: [
                                {
                                    id,
                                    playlistId: id,
                                    title: 'Best Music Videos',
                                    description: 'My favourite music',
                                    thumbnail: 'https://example.com/thumbnail.jpg',
                                    url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
                                    platform: 'youtube',
                                    platformId: 'zzzzzzzzzzz',
                                    render: true,
                                },
                            ],
                        },
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
            parameters: [playlistSchemas.playlistIdField, playlistSearchField],
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
                    errors: { id: ['Invalid UUID'] },
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
                    message: 'Invalid input',
                    errors: {
                        name: ['Playlist name must be between 1 and 50 characters'],
                        description: ['Description must be 500 characters or fewer'],
                    },
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Playlist not found',
                }),
                409: errorResponse({
                    message: 'Could not update playlist',
                    errors: { name: ['You already have a playlist with this name'] },
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
                    errors: { id: ['Invalid UUID'] },
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
                    examples: {
                        invalidPlaylistId: {
                            summary: 'Invalid playlist id',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: {
                                    url: ['Invalid UUID'],
                                },
                            },
                        },
                        invalidUrl: {
                            summary: 'Invalid URL',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: {
                                    url: ['Invalid URL'],
                                },
                            },
                        },
                        unsupportedUrl: {
                            summary: 'Unsupported video URL',
                            value: {
                                success: false,
                                data: null,
                                message: 'Unsupported video URL',
                                errors: {
                                    url: ['Unsupported video URL'],
                                },
                            },
                        },
                        tooManyRedirects: {
                            summary: 'Too many redirects',
                            value: {
                                success: false,
                                data: null,
                                message: 'Too many redirects',
                                errors: {
                                    url: ['Too many redirects'],
                                },
                            },
                        },
                        unableToProcess: {
                            summary: 'Unable to process video URL',
                            value: {
                                success: false,
                                data: null,
                                message: 'Unable to process video URL',
                                errors: {
                                    url: ['Unable to process video URL'],
                                },
                            },
                        },
                    },
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Invalid input or unable to process video URL',
                    examples: {
                        invalidPlaylistId: {
                            summary: 'Invalid playlist id',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: {
                                    url: ['Invalid UUID'],
                                },
                            },
                        },
                        invalidUrl: {
                            summary: 'Invalid URL',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: {
                                    url: ['Invalid URL'],
                                },
                            },
                        },
                        unsupportedUrl: {
                            summary: 'Unsupported video URL',
                            value: {
                                success: false,
                                data: null,
                                message: 'Unsupported video URL',
                                errors: {
                                    url: ['Unsupported video URL'],
                                },
                            },
                        },
                        tooManyRedirects: {
                            summary: 'Too many redirects',
                            value: {
                                success: false,
                                data: null,
                                message: 'Too many redirects',
                                errors: {
                                    url: ['Too many redirects'],
                                },
                            },
                        },
                        unableToProcess: {
                            summary: 'Unable to process video URL',
                            value: {
                                success: false,
                                data: null,
                                message: 'Unable to process video URL',
                                errors: {
                                    url: ['Unable to process video URL'],
                                },
                            },
                        },
                    },
                }),
                409: errorResponse({
                    message: 'Cannot add video',
                    errors: { url: ['You have already added this video to the playlist'] },
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
                    message: 'Invalid input',
                    examples: {
                        invalidTitle: {
                            summary: 'Invalid title',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: {
                                    title: ['Title must be between 1 and 50 characters'],
                                },
                            },
                        },
                        invalidDescription: {
                            summary: 'Invalid description',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: {
                                    description: ['Description must be 500 characters or fewer'],
                                },
                            },
                        },
                        noFieldsProvided: {
                            summary: 'No fields provided',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: {
                                    title: ['Title or description field must be provided'],
                                },
                            },
                        },
                    },
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Playlist or video not found',
                    examples: {
                        playilstNotFound: {
                            summary: 'Playlist not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Playlist not found',
                                errors: {
                                    playlist: ['Playlist not found'],
                                },
                            },
                        },
                        videoNotFound: {
                            summary: 'Video not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Video not found',
                                errors: {
                                    playlist: ['Video not found'],
                                },
                            },
                        },
                    },
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
                    errors: { id: ['invalid UUID'], videoId: ['Invalid UUID'] },
                }),
                401: errorResponse({
                    message: 'Unauthorized',
                }),
                404: errorResponse({
                    message: 'Playlist or video not found',
                    examples: {
                        playilstNotFound: {
                            summary: 'Playlist not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Playlist not found',
                                errors: {
                                    playlist: ['Playlist not found'],
                                },
                            },
                        },
                        videoNotFound: {
                            summary: 'Video not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Video not found',
                                errors: {
                                    playlist: ['Video not found'],
                                },
                            },
                        },
                    },
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
