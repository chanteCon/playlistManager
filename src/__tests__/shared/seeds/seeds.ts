import { PrismaClient, VideoSource } from '@prisma/client';
import {
    buildCode,
    buildPlaylistInput,
    buildRefreshToken,
    buildUser,
} from '__tests__/shared/factories';
import { User } from 'features/user/types';
import { CodeType, UserCode } from 'features/auth/types';
import { hashPassword } from 'shared/utils/hashing';
import { RefreshToken } from '@prisma/client';
import { RedisClientType } from 'redis';
import { Video, VideoWithSource } from 'features/video/types';
import { buildVideoInput, buildVideoWithSource } from '../factories/videoFactory';
import { Playlist, PlaylistVideo } from 'features/playlist/types';

export const seedUser = async (db: PrismaClient, overrides: Partial<User> = {}): Promise<User> => {
    const user = buildUser(overrides);
    const passwordHash = await hashPassword(user.password);
    return db.user.create({ data: { ...user, password: passwordHash } });
};
export const seedUsers = async (
    db: PrismaClient,
    length = 3,
    overrides: Partial<User>[] = [],
): Promise<User[]> => {
    return await Promise.all(Array.from({ length }, (_, i) => seedUser(db, overrides[i] ?? {})));
};
export const seedRefreshToken = async (
    db: PrismaClient,
    overrides: Partial<RefreshToken> = {},
): Promise<RefreshToken> => {
    const token = buildRefreshToken(overrides);
    return db.refreshToken.create({ data: token });
};
export const seedRefreshTokens = async (
    length = 3,
    db: PrismaClient,
    overrides: Partial<RefreshToken>[] = [],
): Promise<RefreshToken[]> => {
    return await Promise.all(
        Array.from({ length }, (_, i) => seedRefreshToken(db, overrides[i] ?? {})),
    );
};

export const seedCode = async (
    redis: RedisClientType,
    codeType: CodeType = 'PASSWORD_RESET',
    overrides: Partial<UserCode> = {},
) => {
    const code = buildCode(codeType, overrides);
    const { codeHash, ...data } = code;
    const ttl = Math.max(Math.floor((code.expiresAt.getTime() - Date.now()) / 1000));
    await redis.set(`user-code:${codeHash}`, JSON.stringify(data), {
        EX: ttl,
    });
    await redis.set(`user-code:${code.userId}:${codeType}`, JSON.stringify({ codeHash, ...data }), {
        EX: ttl,
    });
    return code;
};

export const seedCodes = async (
    redis: RedisClientType,
    length = 3,
    codeType: CodeType = 'PASSWORD_RESET',
    overrides: Partial<UserCode>[] = [],
): Promise<UserCode[]> => {
    return await Promise.all(
        Array.from({ length }, (_, i) => seedCode(redis, codeType, overrides[i] ?? {})),
    );
};

export const seedVideo = async (
    db: PrismaClient,
    overrides: Partial<Video> = {},
): Promise<Video> => {
    const videoInput = buildVideoInput(overrides);
    return await db.video.create({ data: { ...videoInput } });
};

export const seedVideoWithSource = async ({
    db,
    videoOverrides,
    sourceOverrides,
}: {
    db: PrismaClient;
    videoOverrides?: Partial<Video>;
    sourceOverrides?: Partial<VideoSource>;
}): Promise<VideoWithSource> => {
    const videoWithSource = buildVideoWithSource({ sourceOverrides, videoOverrides });
    const { url, source } = videoWithSource;
    const { platform, platformId, title, thumbnail, description, canonicalUrl } = source!;
    const savedSource = await db.videoSource.create({
        data: {
            platform,
            platformId,
            title,
            thumbnail,
            description,
            canonicalUrl,
            ...sourceOverrides,
        },
    });
    return await db.video.create({
        data: {
            url,
            sourceId: savedSource.id,
            ...videoOverrides,
        },
        include: {
            source: true,
        },
    });
};

export const seedPlaylist = async (
    db: PrismaClient,
    overrides: Partial<Playlist> = {},
): Promise<Playlist> => {
    const playlistInput = buildPlaylistInput();
    const playlist = await db.playlist.create({
        data: {
            ...playlistInput,
            ...overrides,
        },
    });
    return playlist;
};

export const seedPlaylists = async (
    db: PrismaClient,
    length = 3,
    overrides: Partial<Playlist>[] = [],
): Promise<Playlist[]> => {
    return await Promise.all(
        Array.from({ length }, (_, i) => seedPlaylist(db, overrides[i] ?? {})),
    );
};

type PlaylistVideoInput = { playlistId: string; videoId: string };
export const seedPlaylistVideo = async (
    db: PrismaClient,
    ids: PlaylistVideoInput,
): Promise<PlaylistVideo> => {
    return db.playlistVideo.create({ data: ids });
};
export const seedPlaylistVideos = async (
    db: PrismaClient,
    ids: PlaylistVideoInput[],
    length = 3,
) => {
    return await Promise.all(Array.from({ length }, (_, i) => seedPlaylistVideo(db, ids[i] ?? {})));
};

export const seedPlaylistWithVideos = async (db: PrismaClient, userId: string) => {
    const videos = await Promise.all(Array.from({ length: 3 }, (_, _i) => seedVideo(db)));
    const playlist = await seedPlaylist(db, { userId });
    const ids = videos.map((video) => ({
        playlistId: playlist.id,
        videoId: video.id,
    }));
    const playlistVideos = await seedPlaylistVideos(db, ids);
    return { playlist, playlistVideos, videos };
};
