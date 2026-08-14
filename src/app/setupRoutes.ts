import { Application, Request, Response } from 'express';
import { createFeatures } from './createFeatures';
import { API_PREFIX } from 'routes/path';

export const setUpRoutes = (app: Application, features: ReturnType<typeof createFeatures>) => {
    app.use(`${API_PREFIX}/users`, features.userFeature.routes);
    app.use(`${API_PREFIX}/auth`, features.authFeature.routes);
    app.use(`${API_PREFIX}/playlists`, features.playlistFeature.routes);

    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ ok: true });
    });
};
