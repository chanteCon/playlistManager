import { PrismaClient } from '@prisma/client';

import { createSearchRepo } from './searchRepo';
import { createSearchService } from './searchService';
import { createSearchController } from './searchController';
import { createSearchRoutes } from './searchRoutes';
import { RequestHandler } from 'express';

type SearchFeatureDeps = {
    db: PrismaClient;
    authUserLimiter: RequestHandler;
};

export const createSearchFeature = ({ db, authUserLimiter }: SearchFeatureDeps) => {
    const searchRepo = createSearchRepo({ db });

    const searchService = createSearchService({
        searchRepo,
    });

    const searchController = createSearchController({
        searchService,
    });

    return {
        routes: createSearchRoutes({ searchController, authUserLimiter }),
    };
};
