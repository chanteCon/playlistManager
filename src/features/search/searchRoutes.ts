import { RequestHandler, Router } from 'express';

import { validate } from 'middleware/validationMiddleware';

import { authMiddleware } from 'features/video/authMiddleware';
import { SearchController } from './searchController';
import { searchSchema } from './schemas';

type SearchRoutesDeps = {
    searchController: SearchController;
    authUserLimiter: RequestHandler;
};

export const createSearchRoutes = ({ searchController, authUserLimiter }: SearchRoutesDeps) => {
    const router = Router();

    router.use(authMiddleware);
    router.use(authUserLimiter);
    router.get('/', validate(searchSchema, 'query'), searchController.searchUserLibrary);

    return router;
};
