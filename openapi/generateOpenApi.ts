import { createDocument } from 'zod-openapi';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { authApiPaths } from './authOpenApi';
import { userApiPaths } from './userOpenApi';
import { ErrorResponse, SuccessResponse } from './commonSchemas';
import dotenv from 'dotenv';
dotenv.config();

const mergedComponents = {
    schemas: {
        ...authApiPaths.components.schemas,
        ...userApiPaths.components.schemas,
        SuccessResponse,
        ErrorResponse,
    },
    securitySchemes: {
        ...authApiPaths.components.securitySchemes,
        ...userApiPaths.components.securitySchemes,
    },
};

const mergedPaths = {
    ...authApiPaths.paths,
    ...userApiPaths.paths,
};

const openApiDoc = createDocument({
    openapi: '3.1.0',
    info: { title: 'Authentication API', version: '1.0.0' },
    servers: [
        {
            url: `${process.env.SERVER_URL}:${process.env.SERVER_PORT}`,
            description: 'Main API server',
        },
    ],
    components: mergedComponents,
    paths: mergedPaths,
});

const outputPath = path.resolve(__dirname, '../openapi.yaml');

fs.writeFileSync(outputPath, YAML.stringify(openApiDoc));
