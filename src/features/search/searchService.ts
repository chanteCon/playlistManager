import { CollectionSummaryDTO } from 'features/collections/types';
import { SearchRepo } from './searchRepo';
import { PlaylistDTO } from 'features/playlist/types';
import { toPlaylistVideoDto } from 'shared/helper';

type SearchServiceDeps = {
    searchRepo: SearchRepo;
};

export type SearchService = ReturnType<typeof createSearchService>;

export const createSearchService = ({ searchRepo }: SearchServiceDeps) => {
    const searchUserLibrary = async (userId: string, search: string) => {
        const { collections, playlists, playlistVideos } = await searchRepo.search(userId, search);

        return {
            collections: collections.map(({ _count, ...collection }): CollectionSummaryDTO => ({
                ...collection,
                numPlaylists: _count.playlists,
            })),

            playlists: playlists.map(({ _count, playlistVideos, ...playlist }): PlaylistDTO => ({
                ...playlist,
                videos: playlistVideos.map(toPlaylistVideoDto),
                numVideos: _count.playlistVideos,
            })),

            videos: playlistVideos.map(toPlaylistVideoDto),
        };
    };

    return {
        searchUserLibrary,
    };
};
