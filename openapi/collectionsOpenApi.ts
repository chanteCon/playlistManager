import * as collectionSchemas from '../src/features/collections/schemas';
import { successResponse, errorResponse } from './commonSchemas';
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
const collectionDTOSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    numPlaylists: z.number(),
    coverUrl: z.string().nullable(),
    playlists: z.array(playlistDTOSchema),
});
const collectionSummaryResponseSchema = z.object({
    collections: z.array(collectionSummaryDTOSchema),
});
const collectionResponseSchema = z.object({ collection: collectionDTOSchema });
const playlistResponseSchema = z.object({ playlist: playlistDTOSchema });

const paths = {
    '/api/collections/': {
        get: {
            summary: 'Get user collections',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],
            responses: {
                200: successResponse({
                    dataSchema: collectionSummaryResponseSchema,
                    data: {
                        collections: [
                            {
                                id,
                                userId: id,
                                name: 'Music',
                                createdAt: '2026-01-01T00:00:00.000Z',
                                updatedAt: '2026-01-01T00:00:00.000Z',
                                numPlaylists: 3,
                                coverUrl: 'https://example.com/cover.jpg',
                            },
                        ],
                    },
                }),
                401: errorResponse({ message: 'Unauthorized' }),
            },
        },
        post: {
            summary: 'Create collection',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: collectionSchemas.createCollectionSchema,
                        example: { name: 'Music' },
                    },
                },
            },
            responses: {
                201: successResponse({
                    dataSchema: collectionResponseSchema,
                    data: {
                        collection: {
                            id,
                            userId: id,
                            name: 'Music',
                            createdAt: '2026-01-01T00:00:00.000Z',
                            updatedAt: '2026-01-01T00:00:00.000Z',
                            numPlaylists: 0,
                            coverUrl: null,
                            playlists: [],
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid input',
                    errors: { name: ['Collection name must be 100 characters or less'] },
                }),
                401: errorResponse({ message: 'Unauthorized' }),
                409: errorResponse({
                    message: 'Cannot add collection',
                    errors: { name: ['You already have a collection with this name'] },
                }),
            },
        },
    },
    '/api/collections/{id}': {
        get: {
            summary: 'Get collection',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],
            parameters: [collectionSchemas.collectionIdField],
            responses: {
                200: successResponse({
                    dataSchema: collectionResponseSchema,
                    data: {
                        collection: {
                            id,
                            userId: id,
                            name: 'Music',
                            createdAt: '2026-01-01T00:00:00.000Z',
                            updatedAt: '2026-01-01T00:00:00.000Z',
                            numPlaylists: 2,
                            coverUrl: 'https://example.com/cover.jpg',
                            playlists: [
                                {
                                    id,
                                    userId: id,
                                    title: 'My Playlist',
                                    description: null,
                                    platform: 'youtube',
                                    platformId: 'abc123',
                                    thumbnailUrl: 'https://example.com/thumbnail.jpg',
                                    position: 0,
                                    customTitle: null,
                                    customDescription: null,
                                },
                            ],
                        },
                    },
                }),
                400: errorResponse({ message: 'Invalid Input', errors: { id: ['Invalid UUID'] } }),
                401: errorResponse({ message: 'Unauthorized' }),
                404: errorResponse({ message: 'Collection not found' }),
            },
        },
        patch: {
            summary: 'Update collection',
            description:
                'Updates a collection name and/or cover. To set the cover, provide the ID of a playlist already in the collection. The selected playlist must have a cover image. Provide null to remove the current cover. If cover is omitted, the existing cover is preserved.',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],
            parameters: [collectionSchemas.collectionIdField],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: collectionSchemas.updateCollectionSchema,
                        examples: {
                            updateName: {
                                summary: 'Update collection name',
                                value: { name: 'Updated Collection' },
                            },
                            updateCover: {
                                summary: 'Set cover from a playlist',
                                description:
                                    'The playlist must already belong to the collection and must have a cover image.',
                                value: { cover: id },
                            },
                            removeCover: {
                                summary: 'Remove collection cover',
                                value: { cover: null },
                            },
                            updateNameAndCover: {
                                summary: 'Update name and cover',
                                value: { name: 'Updated Collection', cover: id },
                            },
                        },
                    },
                },
            },
            responses: {
                200: successResponse({
                    dataSchema: collectionResponseSchema,
                    data: {
                        collection: {
                            id,
                            userId: id,
                            name: 'Updated Collection',
                            createdAt: '2026-01-01T00:00:00.000Z',
                            updatedAt: '2026-01-01T00:00:00.000Z',
                            numPlaylists: 2,
                            coverUrl: 'https://example.com/cover.jpg',
                            playlists: [],
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid input',
                    errors: {
                        name: ['Collection name must be 100 characters or less'],
                        cover: ['Invalid UUID'],
                        id: ['Invalid UUID'],
                    },
                    examples: {
                        invalidName: {
                            summary: 'Invalid collection name',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: {
                                    name: ['Collection name must be 100 characters or less'],
                                },
                            },
                        },
                        invalidCover: {
                            summary: 'Invalid cover playlist ID',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: { cover: ['Invalid UUID'] },
                            },
                        },
                        playlistHasNoCover: {
                            summary: 'Selected playlist has no cover',
                            value: {
                                success: false,
                                data: null,
                                message: 'Cannot set playlist as cover',
                                errors: { cover: ['This playlist does not have a cover'] },
                            },
                        },
                        noFieldsProvided: {
                            summary: 'No fields provided',
                            value: {
                                success: false,
                                data: null,
                                message: 'Invalid input',
                                errors: {},
                            },
                        },
                    },
                }),
                401: errorResponse({ message: 'Unauthorized' }),
                404: errorResponse({
                    message: 'Collection not found',
                    examples: {
                        collectionNotFound: {
                            summary: 'Collection not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Collection not found',
                                errors: { collection: ['Collection not found'] },
                            },
                        },
                        playlistNotFound: {
                            summary: 'Selected playlist is not in the collection',
                            value: {
                                success: false,
                                data: null,
                                message: 'Collection or playlist not found',
                                errors: {
                                    cover: [
                                        'Could not find playlist selected for the cover image in this collection.',
                                    ],
                                },
                            },
                        },
                    },
                }),
                409: errorResponse({
                    message: 'Cannot update collection',
                    errors: { name: ['You already have a collection with this name'] },
                }),
            },
        },
        delete: {
            summary: 'Delete collection',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],
            parameters: [collectionSchemas.collectionIdField],
            responses: {
                204: { description: 'Collection deleted successfully' },
                400: errorResponse({ message: 'Invalid Input', errors: { id: ['Invalid UUID'] } }),
                401: errorResponse({ message: 'Unauthorized' }),
                404: errorResponse({ message: 'Collection not found' }),
            },
        },
    },
    '/api/collections/{id}/playlists/{playlistId}': {
        post: {
            summary: 'Add playlist to collection',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],
            parameters: [collectionSchemas.collectionIdField, collectionSchemas.playlistIdField],
            responses: {
                200: successResponse({
                    dataSchema: playlistResponseSchema,
                    data: {
                        playlist: {
                            id,
                            userId: id,
                            title: 'My Playlist',
                            description: null,
                            platform: 'youtube',
                            platformId: 'abc123',
                            thumbnailUrl: 'https://example.com/thumbnail.jpg',
                            position: 0,
                            customTitle: null,
                            customDescription: null,
                        },
                    },
                }),
                400: errorResponse({
                    message: 'Invalid Input',
                    errors: { id: ['Invalid UUID'], playlistId: ['Invalid UUID'] },
                }),
                401: errorResponse({ message: 'Unauthorized' }),
                404: errorResponse({
                    message: 'Collection or playlist not found',
                    examples: {
                        collectionNotFound: {
                            summary: 'Collection not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Collection not found',
                                errors: { collection: ['Collection not found'] },
                            },
                        },
                        playlistNotFound: {
                            summary: 'Playlist not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Playlist not found',
                                errors: { playlist: ['Playlist not found'] },
                            },
                        },
                    },
                }),
                409: errorResponse({
                    message: 'Cannot add playlist to collection',
                    errors: {
                        playlist: ['You have already added this playlist to this collection'],
                    },
                }),
            },
        },
        delete: {
            summary: 'Remove playlist from collection',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],
            parameters: [collectionSchemas.collectionIdField, collectionSchemas.playlistIdField],
            responses: {
                204: { description: 'Playlist removed from collection successfully' },
                400: errorResponse({
                    message: 'Invalid Input',
                    errors: { id: ['Invalid UUID'], playlistId: ['Invalid UUID'] },
                }),
                401: errorResponse({ message: 'Unauthorized' }),
                404: errorResponse({
                    message: 'Collection or playlist not found',
                    examples: {
                        collectionNotFound: {
                            summary: 'Collection not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Collection not found',
                                errors: { collection: ['Collection not found'] },
                            },
                        },
                        playlistNotFound: {
                            summary: 'Playlist not found in collection',
                            value: {
                                success: false,
                                data: null,
                                message: 'Playlist not found in this collection',
                                errors: { playlist: ['Playlist not found in this collection'] },
                            },
                        },
                    },
                }),
            },
        },
    },
};
export const collectionsApiPaths = {
    openapi: '3.1.0',
    info: { title: 'Collections API', version: '1.0.0' },
    paths,
};
