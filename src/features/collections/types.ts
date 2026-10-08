import { PlaylistWithNumVideos } from 'features/playlist/types';
import { CollectionPlaylist as PrismaCollectionPlaylist } from '@prisma/client';

export type CollectionCreateData = { name: string; userId: string };
export type CollectionPlaylistParams = {
    id: string;
    playlistId: string;
};
export type CollectionUpdateData = { name?: string; cover?: string | null };

export type CollectionUpdateParams = { id: string; name?: string; coverUrl?: string | null };

export type CollectionSummaryDTO = {
    name: string;
    id: string;
    userId: string;
    updatedAt: Date;
    createdAt: Date;
    numPlaylists: number;
    coverUrl: string | null;
};

export type CollectionDTO = {
    name: string;
    id: string;
    userId: string;
    updatedAt: Date;
    createdAt: Date;
    numPlaylists: number;
    coverUrl: string | null;
    playlists: PlaylistWithNumVideos[];
};

export type CollectionPlaylist = PrismaCollectionPlaylist;
