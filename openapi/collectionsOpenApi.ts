import * as collectionSchemas from '../src/features/collections/schemas';

import { successResponse, errorResponse } from './commonSchemas';

import { z } from 'zod';

const id = '00000000-0000-0000-0000-000000000000';

const collectionDTOSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

const collectionResponseSchema = z.object({
    collection: collectionDTOSchema,
});

const paths = {
    '/api/collections': {
        post: {
            summary: 'Create collection',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: collectionSchemas.createCollectionSchema,
                        example: {
                            name: 'Music',
                        },
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
                        },
                    },
                }),

                400: errorResponse({
                    message: 'Invalid input',
                    errors: {
                        name: ['Collection name must be between 1 and 50 characters'],
                    },
                }),

                401: errorResponse({
                    message: 'Unauthorized',
                }),

                409: errorResponse({
                    message: 'Cannot add collection',
                    errors: {
                        name: ['You already have a collection with this name'],
                    },
                }),
            },
        },
    },

    '/api/collections/{id}': {
        patch: {
            summary: 'Update collection',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],

            parameters: [collectionSchemas.collectionIdField],

            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: collectionSchemas.updateCollectionSchema,
                        example: {
                            name: 'Updated Collection',
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
                        },
                    },
                }),

                400: errorResponse({
                    message: 'Invalid input',
                    errors: {
                        name: ['Collection name must be between 1 and 50 characters'],
                        id: ['Invalid UUID'],
                    },
                }),

                401: errorResponse({
                    message: 'Unauthorized',
                }),

                404: errorResponse({
                    message: 'Collection not found',
                }),

                409: errorResponse({
                    message: 'Cannot update collection',
                    errors: {
                        name: ['You already have a collection with this name'],
                    },
                }),
            },
        },

        delete: {
            summary: 'Delete collection',
            tags: ['Collection'],
            security: [{ BearerAuth: [] }],

            parameters: [collectionSchemas.collectionIdField],

            responses: {
                204: {
                    description: 'Collection deleted successfully',
                },

                400: errorResponse({
                    message: 'Invalid Input',
                    errors: {
                        id: ['Invalid UUID'],
                    },
                }),

                401: errorResponse({
                    message: 'Unauthorized',
                }),

                404: errorResponse({
                    message: 'Collection not found',
                }),
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
                204: {
                    description: 'Playlist added to collection successfully',
                },

                400: errorResponse({
                    message: 'Invalid Input',
                    errors: {
                        id: ['Invalid UUID'],
                        playlistId: ['Invalid UUID'],
                    },
                }),

                401: errorResponse({
                    message: 'Unauthorized',
                }),

                404: errorResponse({
                    message: 'Collection or playlist not found',
                    examples: {
                        collectionNotFound: {
                            summary: 'Collection not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Collection not found',
                                errors: {
                                    collection: ['Collection not found'],
                                },
                            },
                        },

                        playlistNotFound: {
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
                    },
                }),

                409: errorResponse({
                    message: 'Cannot add playlist to collection',
                    errors: {
                        nameplaylist: ['You have already added this playlist to this collection'],
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
                204: {
                    description: 'Playlist removed from collection successfully',
                },

                400: errorResponse({
                    message: 'Invalid Input',
                    errors: {
                        id: ['Invalid UUID'],
                        playlistId: ['Invalid UUID'],
                    },
                }),

                401: errorResponse({
                    message: 'Unauthorized',
                }),

                404: errorResponse({
                    message: 'Collection or playlist not found',
                    examples: {
                        collectionNotFound: {
                            summary: 'Collection not found',
                            value: {
                                success: false,
                                data: null,
                                message: 'Collection not found',
                                errors: {
                                    collection: ['Collection not found'],
                                },
                            },
                        },

                        playlistNotFound: {
                            summary: 'Playlist not found in collection',
                            value: {
                                success: false,
                                data: null,
                                message: 'Playlist not found in this collection',
                                errors: {
                                    playlist: ['Playlist not found in this collection'],
                                },
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
    info: {
        title: 'Collections API',
        version: '1.0.0',
    },
    paths,
};
