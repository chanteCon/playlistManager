import { Response } from 'express';

import { SearchService } from './searchService';
import { AuthRequest } from 'features/auth/types';

type SearchControllerDeps = {
    searchService: SearchService;
};
export type SearchController = ReturnType<typeof createSearchController>;
export const createSearchController = ({ searchService }: SearchControllerDeps) => {
    const searchUserLibrary = async (
        req: AuthRequest<any, any, any, { search: string }>,
        res: Response,
    ) => {
        const { search } = req.query;

        const result = await searchService.searchUserLibrary(req.user!.id, search);

        return res.status(200).json(result);
    };

    return {
        searchUserLibrary,
    };
};
