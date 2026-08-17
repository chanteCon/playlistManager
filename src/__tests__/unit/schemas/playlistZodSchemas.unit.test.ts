import { buildPlaylistInput } from '__tests__/shared/factories';
import {
    playlistCreateSchema,
    playlistIdSchema,
    playlistUpdateSchema,
    playlistVideoRefSchema,
    updateVideoSchema,
    videoUrlSchema,
} from 'features/playlist/schemas';
import { testZodSchema } from './testZodSchema';
import { randomUUID } from 'crypto';

describe('Unit tests: Playlist Schemas', () => {
    const playlistInputData = buildPlaylistInput();
    describe('Create playlist schema', () => {
        const { name, description } = playlistInputData;
        const config = {
            schema: playlistCreateSchema,
            validInput: { name, description },
            fields: [
                { field: 'name', badValue: 2 },
                { field: 'description', badValue: 2 },
            ],
            required: ['name'],
            extraFieldKey: 'userId',
        };
        testZodSchema(config);
        test('Rejects empty name', () => {
            const res = playlistCreateSchema.safeParse({
                name: '',
            });

            expect(res.success).toBe(false);
        });
    });
    describe('Playlist Id Schema', () => {
        const config = {
            schema: playlistIdSchema,
            validInput: { id: randomUUID() },
            fields: [{ field: 'id', badValue: 'abc' }],
            required: ['id'],
            extraFieldKey: 'videoId',
        };
        testZodSchema(config);
    });
    describe('Update playlist schema', () => {
        const { name, description } = playlistInputData;
        const config = {
            schema: playlistUpdateSchema,
            validInput: { name, description },
            fields: [
                { field: 'name', badValue: 2 },
                { field: 'description', badValue: 2 },
            ],
            required: [],
            extraFieldKey: 'userId',
        };
        testZodSchema(config);

        test('Requires at least one field', () => {
            const res = playlistUpdateSchema.safeParse({});

            expect(res.success).toBe(false);
        });

        test('Rejects empty name', () => {
            const res = playlistUpdateSchema.safeParse({
                name: '',
            });

            expect(res.success).toBe(false);
        });
    });
    describe('Video url schema', () => {
        const config = {
            schema: videoUrlSchema,
            validInput: { url: 'https://example.com.au' },
            fields: [{ field: 'url', badValue: 'noturl' }],
            required: ['url'],
            extraFieldKey: 'userId',
        };
        testZodSchema(config);
    });
    describe('Update video schema', () => {
        const config = {
            schema: updateVideoSchema,
            validInput: {
                title: 'Video one',
                description: 'This is a description example.',
            },
            fields: [
                { field: 'title', badValue: 2 },
                { field: 'description', badValue: 2 },
            ],
            required: [],
            extraFieldKey: 'userId',
        };

        testZodSchema(config);

        test('Requires at least one field', () => {
            const res = updateVideoSchema.safeParse({});

            expect(res.success).toBe(false);
        });

        test('Accepts custom title only', () => {
            const res = updateVideoSchema.safeParse({
                title: 'Video one',
            });

            expect(res.success).toBe(true);
        });

        test('Accepts description only', () => {
            const res = updateVideoSchema.safeParse({
                description: 'This is a description example.',
            });

            expect(res.success).toBe(true);
        });
    });

    describe('Playlist video reference schema', () => {
        const config = {
            schema: playlistVideoRefSchema,
            validInput: {
                id: randomUUID(),
                playlistVideoId: randomUUID(),
            },
            fields: [
                { field: 'id', badValue: 'abc' },
                { field: 'playlistVideoId', badValue: 'abc' },
            ],
            required: ['id', 'playlistVideoId'],
            extraFieldKey: 'userId',
        };

        testZodSchema(config);
    });
});
