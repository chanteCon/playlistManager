import { successResponse, errorResponse } from './commonSchemas';
import { searchSchema } from '../src/features/search/schemas';
import { z } from 'zod';

const id = '00000000-0000-0000-0000-000000000000';

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
    position: z.number(),
});

const playlistDTOSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    videos: z.array(playlistVideoDTOSchema),
    coverUrl: z.string().nullable(),
    numVideos: z.number(),
    updatedAt: z.string(),
});

const collectionSummaryDTOSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    numPlaylists: z.number(),
    coverUrl: z.string().nullable(),
});

const searchResponseSchema = z.object({
    collections: z.array(collectionSummaryDTOSchema),
    playlists: z.array(playlistDTOSchema),
    videos: z.array(playlistVideoDTOSchema),
});

const paths = {
    '/api/search': {
        get: {
            summary: 'Search user library',
            description: 'Searches the authenticated user’s collections, playlists, and videos.',
            tags: ['Search'],
            security: [{ BearerAuth: [] }],

            requestParams: {
                query: searchSchema,
            },

            responses: {
                200: successResponse({
                    dataSchema: searchResponseSchema,
                    data: {
                        collections: [
                            {
                                id,
                                userId: id,
                                name: 'Music Collection',
                                createdAt: '2026-01-01T00:00:00.000Z',
                                updatedAt: '2026-01-01T00:00:00.000Z',
                                numPlaylists: 2,
                                coverUrl: 'https://example.com/cover.jpg',
                            },
                        ],

                        playlists: [
                            {
                                id,
                                name: 'Music Favourites',
                                description: 'My favourite music',
                                videos: [
                                    {
                                        id,
                                        playlistId: id,
                                        title: 'Best Music Videos',
                                        description: 'My favourite music videos',
                                        thumbnail: 'https://example.com/thumbnail.jpg',
                                        url: 'https://youtube.com/watch?v=abc123',
                                        platform: 'youtube',
                                        platformId: 'abc123',
                                        render: true,
                                        position: 0,
                                    },
                                ],
                                coverUrl: 'https://example.com/cover.jpg',
                                numVideos: 1,
                                updatedAt: '2026-01-01T00:00:00.000Z',
                            },
                        ],

                        videos: [
                            {
                                id,
                                playlistId: id,
                                title: 'Best Music Videos',
                                description: 'My favourite music videos',
                                thumbnail: 'https://example.com/thumbnail.jpg',
                                url: 'https://youtube.com/watch?v=abc123',
                                platform: 'youtube',
                                platformId: 'abc123',
                                render: true,
                                position: 0,
                            },
                        ],
                    },
                }),

                400: errorResponse({
                    message: 'Invalid input',
                    errors: {
                        search: ['Invalid input'],
                    },
                }),

                401: errorResponse({
                    message: 'Unauthorized',
                }),
            },
        },
    },
};

export const searchApiPaths = {
    openapi: '3.1.0',
    info: {
        title: 'Search API',
        version: '1.0.0',
    },
    paths,
};
