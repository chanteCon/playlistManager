import { VideoService } from 'features/video/services/videoService';
import { PlaylistRepo } from '../repos/playlistRepo';
import { PlaylistVideoRepo } from '../repos/playlistVideoRepo';
import {
    Playlist,
    PlaylistCreateData,
    PlaylistDTO,
    PlaylistUpdateInput,
    PlaylistVideoDTO,
    PlaylistVideoWithInclude,
} from '../types';
import { NotFoundError } from 'shared/errors/errors';
import {
    handleNotFoundError,
    handleUniqueConstraintError,
    translateForeignKeyError,
} from 'database/prisma/repoError';
import { RENDERABLE_PLATFORMS } from 'features/video/constants';

type PlaylistServiceDeps = {
    playlistRepo: PlaylistRepo;
    playlistVideoRepo: PlaylistVideoRepo;
    videoService: VideoService;
};
export type PlaylistService = ReturnType<typeof createPlaylistService>;

export const createPlaylistService = ({
    playlistRepo,
    playlistVideoRepo,
    videoService,
}: PlaylistServiceDeps) => {
    //// Internal ////////////////////////////////////
    const _ensurePlaylistExistsForUser = async (
        playlistId: string,
        userId: string,
    ): Promise<void> => {
        const playlistExsists = await playlistRepo.existsForUser(playlistId, userId);
        if (!playlistExsists) {
            throw new NotFoundError('Playlist not found');
        }
    };

    const _toPlaylistVideoDto = (playlistVideo: PlaylistVideoWithInclude): PlaylistVideoDTO => {
        const { video } = playlistVideo;
        const source = video.source;

        return {
            id: playlistVideo.id,
            title: playlistVideo.customTitle ?? source?.title ?? '',
            description: playlistVideo.customDescription ?? source?.description ?? '',
            thumbnail: source?.thumbnail ?? '',
            url: source?.canonicalUrl ?? video.url,
            platform: source?.platform ?? null,
            platformId: source?.platformId ?? null,
            render: RENDERABLE_PLATFORMS.has(source?.platform ?? ''),
        };
    };

    //// External ////////////////////////////////////

    /// Playlist /////////////////////////////////////
    const create = async (userId: string, data: PlaylistCreateData): Promise<Playlist> => {
        try {
            return await playlistRepo.create({ userId, ...data });
        } catch (error) {
            translateForeignKeyError(error, NotFoundError, 'User not found');
            handleUniqueConstraintError(error, 'You have another playlist with this name');
            throw error;
        }
    };

    const getUserPlaylists = async (userId: string): Promise<Playlist[]> => {
        return await playlistRepo.findUserPlaylists(userId);
    };

    const getPlaylistById = async (userId: string, playlistId: string): Promise<PlaylistDTO> => {
        const playlist = await playlistRepo.findById(playlistId, userId);
        if (!playlist) {
            throw new NotFoundError('Playlist not found');
        }
        return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            videos: playlist.playlistVideos.map(_toPlaylistVideoDto),
        };
    };

    const update = async (
        userId: string,
        playlistId: string,
        data: PlaylistUpdateInput,
    ): Promise<Playlist> => {
        try {
            return await playlistRepo.update(playlistId, userId, data);
        } catch (error) {
            handleUniqueConstraintError(error, 'You have another playlist with this name');
            handleNotFoundError(error, 'Playlist not found');
            throw error;
        }
    };

    const remove = async (userId: string, playlistId: string): Promise<Playlist> => {
        try {
            return await playlistRepo.deleteById(playlistId, userId);
        } catch (error) {
            handleNotFoundError(error, 'Playlist not found');
            throw error;
        }
    };

    /// Playlist Video /////////////////////////////////
    type AddVideoData = {
        playlistId: string;
        url: string;
    };
    const addVideo = async (
        userId: string,
        { playlistId, url }: AddVideoData,
    ): Promise<PlaylistVideoDTO> => {
        await _ensurePlaylistExistsForUser(playlistId, userId);
        const video = await videoService.addFromUrl(url);
        try {
            const playlistVideo = await playlistVideoRepo.create(playlistId, video.id);
            return _toPlaylistVideoDto(playlistVideo);
        } catch (error) {
            handleUniqueConstraintError(error, 'You have another playlist with this name');
            translateForeignKeyError(error, NotFoundError, 'Playlist or video not found');
            throw error;
        }
    };

    type UpdatePlaylistVideoData = {
        playlistId: string;
        playlistVideoId: string;
        data: { customTitle?: string; customDescription?: string };
    };
    const updateVideo = async (
        userId: string,
        { playlistId, playlistVideoId, data }: UpdatePlaylistVideoData,
    ): Promise<PlaylistVideoDTO> => {
        await _ensurePlaylistExistsForUser(playlistId, userId);
        try {
            const playlistVideo = await playlistVideoRepo.update(playlistVideoId, playlistId, data);
            return _toPlaylistVideoDto(playlistVideo);
        } catch (error) {
            handleNotFoundError(error, 'Playlist video not found');
            throw error;
        }
    };

    type RemovePlaylistVideoData = {
        playlistId: string;
        playlistVideoId: string;
    };
    const removeVideo = async (
        userId: string,
        { playlistId, playlistVideoId }: RemovePlaylistVideoData,
    ): Promise<void> => {
        await _ensurePlaylistExistsForUser(playlistId, userId);
        try {
            await playlistVideoRepo.deleteFromPlaylist(playlistId, playlistVideoId);
        } catch (error) {
            handleNotFoundError(error, 'Playlist or video not found');
            throw error;
        }
    };

    return {
        create,
        getUserPlaylists,
        getPlaylistById,
        update,
        remove,
        removeVideo,
        addVideo,
        updateVideo,
    };
};
