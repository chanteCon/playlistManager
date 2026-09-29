import { createDocument } from 'zod-openapi';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { authApiPaths } from './authOpenApi';
import { userApiPaths } from './userOpenApi';
import { ErrorResponse, SuccessResponse } from './commonSchemas';
import dotenv from 'dotenv';
import { playlistApiPaths } from './playlistOpenApi';
import { collectionsApiPaths } from './collectionsOpenApi';
import { searchApiPaths } from './searchOpenapi';
dotenv.config();

const mergedComponents = {
    schemas: {
        ...authApiPaths.components.schemas,
        ...userApiPaths.components.schemas,
        ...playlistApiPaths.components.schemas,
        SuccessResponse,
        ErrorResponse,
    },
    securitySchemes: {
        ...authApiPaths.components.securitySchemes,
        ...userApiPaths.components.securitySchemes,
        ...playlistApiPaths.components.securitySchemes,
    },
};

const mergedPaths = {
    ...authApiPaths.paths,
    ...userApiPaths.paths,
    ...playlistApiPaths.paths,
    ...collectionsApiPaths.paths,
    ...searchApiPaths.paths,
};

const openApiDoc = createDocument({
    openapi: '3.1.0',
    info: {
        title: 'Playlist Manager API',
        version: '1.0.0',
        description: `Playlist Manager is an API for managing users, playlists, and video collections.
    It provides authentication, playlist management, and video integration features.
    Requests are rate limited .`,
    },
    servers: [
        {
            url: `http://localhost:${process.env.SERVER_PORT}`,
            description: 'Local development server',
        },
        {
            url: 'https://playlist.api.chantellecs.com',
            description: 'Deployed server',
        },
    ],
    components: mergedComponents,
    paths: mergedPaths,
});

const outputPath = path.resolve(__dirname, '../openapi.yaml');

fs.writeFileSync(outputPath, YAML.stringify(openApiDoc));
