import { Response } from 'express';
import { PlaylistVideoDTO, PlaylistVideoWithInclude } from 'features/playlist/types';
import { RENDERABLE_PLATFORMS } from 'features/video/constants';

export const canSendResponse = (res: Response) => {
    return !res.headersSent;
};

export const toPlaylistVideoDto = (playlistVideo: PlaylistVideoWithInclude): PlaylistVideoDTO => {
    const { video } = playlistVideo;
    const source = video.source;

    return {
        id: playlistVideo.id,
        playlistId: playlistVideo.playlistId,
        title: playlistVideo.customTitle ?? source?.title ?? '',
        description: playlistVideo.customDescription ?? source?.description ?? '',
        thumbnail: source?.thumbnail ?? '',
        url: source?.canonicalUrl ?? video.url,
        platform: source?.platform ?? null,
        platformId: source?.platformId ?? null,
        render: RENDERABLE_PLATFORMS.has(source?.platform ?? ''),
        position: playlistVideo.position,
    };
};
