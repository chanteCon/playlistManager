import { VideoService } from 'features/video/services/videoService';
import { PlaylistRepo } from '../repos/playlistRepo';
import { PlaylistVideoRepo } from '../repos/playlistVideoRepo';
import {
    Playlist,
    PlaylistCreateData,
    PlaylistDTO,
    PlaylistUpdateInput,
    PlaylistVideoDTO,
} from '../types';
import { BadInputError, NotFoundError } from 'shared/errors/errors';
import {
    handleNotFoundError,
    handleUniqueConstraintError,
    translateForeignKeyError,
} from 'database/prisma/repoError';
import { toPlaylistVideoDto } from 'shared/helper';

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
    const ensurePlaylistExistsForUser = async (
        playlistId: string,
        userId: string,
    ): Promise<void> => {
        const playlistExsists = await playlistRepo.existsForUser(playlistId, userId);
        if (!playlistExsists) {
            throw new NotFoundError('Playlist not found', { playlist: ['Playlist not found'] });
        }
    };

    /// Playlist /////////////////////////////////////
    const create = async (
        userId: string,
        data: PlaylistCreateData,
    ): Promise<Playlist & { numVideos: number }> => {
        try {
            const playlist = await playlistRepo.create({ userId, ...data });

            return {
                ...playlist,
                numVideos: 0,
            };
        } catch (error) {
            translateForeignKeyError(error, new NotFoundError('User not found'));
            handleUniqueConstraintError(error, 'Could not add playlist', {
                name: ['You already have a playlist with this name'],
            });
            throw error;
        }
    };

    const getUserPlaylists = async (
        userId: string,
    ): Promise<(Playlist & { numVideos: number })[]> => {
        const playlists = await playlistRepo.findUserPlaylists(userId);

        return playlists.map((playlist) => ({
            ...playlist,
            numVideos: playlist._count.playlistVideos,
        }));
    };

    const getPlaylistById = async (userId: string, playlistId: string): Promise<PlaylistDTO> => {
        const playlist = await playlistRepo.findById(playlistId, userId);
        if (!playlist) {
            throw new NotFoundError('Playlist not found');
        }
        const numVideos = playlist._count.playlistVideos;
        return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            coverUrl: playlist.coverUrl,
            videos: playlist.playlistVideos.map(toPlaylistVideoDto),
            numVideos: numVideos,
            updatedAt: playlist.updatedAt,
        };
    };

    const searchUserLibrary = async (userId: string, search: string) => {
        const { playlists, playlistVideos } = await playlistRepo.search(userId, search);

        return {
            playlists,
            videos: playlistVideos.map(toPlaylistVideoDto),
        };
    };

    const update = async (
        userId: string,
        playlistId: string,
        data: PlaylistUpdateInput,
    ): Promise<Playlist> => {
        try {
            const { cover, ...playlistData } = data;
            let coverUrl: string | null | undefined;
            if (cover !== undefined) {
                if (cover === null) {
                    coverUrl = null;
                } else {
                    await ensurePlaylistExistsForUser(playlistId, userId);
                    const playlistVideo = await playlistVideoRepo.findSource(cover, playlistId);
                    if (!playlistVideo) {
                        throw new NotFoundError('Cannot set video as playlist cover image', {
                            cover: ['Video not found'],
                        });
                    }
                    if (!playlistVideo.video.source || !playlistVideo.video.source.thumbnail) {
                        throw new BadInputError('Cannot set video as playlist cover', {
                            cover: ['This video does not have a thumbnail'],
                        });
                    }
                    coverUrl = playlistVideo.video.source.thumbnail;
                }
            }
            return await playlistRepo.update(playlistId, userId, { ...playlistData, coverUrl });
        } catch (error) {
            handleUniqueConstraintError(error, 'Could not update playlist', {
                name: ['You already have a playlist with this name'],
            });
            handleNotFoundError(error, 'Playlist not found');
            throw error;
        }
    };

    const updatePositions = async (
        userId: string,
        playlistId: string,
        positions: { id: string; position: number }[],
    ) => {
        try {
            await ensurePlaylistExistsForUser(playlistId, userId);

            return await playlistVideoRepo.updatePositions({
                playlistId,
                positions,
            });
        } catch (error) {
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
        await ensurePlaylistExistsForUser(playlistId, userId);
        const video = await videoService.addFromUrl(url);
        try {
            const playlistVideo = await playlistVideoRepo.create(playlistId, video.id);
            return toPlaylistVideoDto(playlistVideo);
        } catch (error) {
            handleUniqueConstraintError(error, 'Cannot add video', {
                url: ['You have already added this video to the playlist'],
            });
            translateForeignKeyError(error, new NotFoundError('Playlist or video not found'));
            throw error;
        }
    };

    type UpdatePlaylistVideoData = {
        playlistId: string;
        playlistVideoId: string;
        data: { title?: string; description?: string };
    };
    const updateVideo = async (
        userId: string,
        { playlistId, playlistVideoId, data }: UpdatePlaylistVideoData,
    ): Promise<PlaylistVideoDTO> => {
        await ensurePlaylistExistsForUser(playlistId, userId);
        try {
            const playlistVideo = await playlistVideoRepo.update(playlistVideoId, playlistId, {
                customTitle: data?.title,
                customDescription: data?.description,
            });
            return toPlaylistVideoDto(playlistVideo);
        } catch (error) {
            handleNotFoundError(error, 'Playlist video not found', {
                video: ['Video not found in playlist'],
            });
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
        await ensurePlaylistExistsForUser(playlistId, userId);
        try {
            await playlistVideoRepo.deleteFromPlaylist(playlistId, playlistVideoId);
        } catch (error) {
            handleNotFoundError(error, 'Playlist or video not found', {
                video: ['This video no longer exists in this playlist'],
            });
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
        searchUserLibrary,
        updatePositions,
        ensurePlaylistExistsForUser,
    };
};
