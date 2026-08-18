import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from 'middleware/errorMiddleware';
import { API_PREFIX } from 'routes/path';
import { responseWrapper } from 'middleware/responseWrapper';
import path from 'path';
import fs from 'node:fs';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';
import { logger } from 'shared/logger/logger';
import { createRateLimiter } from 'middleware/rateLimitMiddleware';
import { RedisClientType } from 'redis';
import { PrismaClient } from '@prisma/client';
import { createFeatures } from 'app/createFeatures';
import { setUpRoutes } from './setupRoutes';
import { timeout } from 'middleware/timeoutMiddleware';

type AppDeps = {
    db: PrismaClient;
    redis: RedisClientType;
};

export const createApp = (appDeps: AppDeps): Application => {
    const { db, redis } = appDeps;
    const app: Application = express();

    app.use(timeout(20000));
    setUpRequestParsing(app);
    app.use(responseWrapper);
    setUpRateLimiters(app, redis);

    setUpSecurityMiddleware(app);

    setUpLogging(app);

    if (process.env.NODE_ENV === 'development') {
        setUpDocs(app);
    }

    const features = createFeatures({
        db,
        redis,
    });

    setUpRoutes(app, features);
    app.use(errorHandler);
    return app;
};

const setUpRequestParsing = (app: Application) => {
    app.use(cookieParser());
    app.use(express.json({ limit: '100kb' }));
};

const setUpRateLimiters = (app: Application, redis: RedisClientType) => {
    const globalRateLimiter = createRateLimiter(redis, { type: 'IP', max: 300 });
    const authRouteLimiter = createRateLimiter(redis, { type: 'IP', max: 20, keyPrefix: 'auth' });
    app.use(API_PREFIX, globalRateLimiter);
    app.use(`${API_PREFIX}/auth`, authRouteLimiter);
    return authRouteLimiter;
};

const setUpSecurityMiddleware = (app: Application) => {
    app.use(helmet());
    app.use(cors());
};

const setUpLogging = (app: Application) => {
    if (process.env.NODE_ENV === 'production') {
        app.use(
            morgan('combined', {
                stream: {
                    write: (message) => logger.log(message.trim()),
                },
            }),
        );
    } else if (process.env.NODE_ENV === 'development') {
        app.use(
            morgan('dev', {
                stream: {
                    write: (message) => logger.log(message.trim()),
                },
            }),
        );
    }
};
const setUpDocs = (app: Application) => {
    const file = fs.readFileSync(path.join(process.cwd(), 'openapi.yaml'), 'utf8');
    const swaggerDocument = YAML.parse(file);
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
