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
import { faker } from '@faker-js/faker';

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
            extraFieldKey: 'id',
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
            validInput: { playlistId: randomUUID() },
            fields: [{ field: 'playlistId', badValue: 'abc' }],
            required: ['playlistId'],
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
            extraFieldKey: 'id',
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
            validInput: { url: faker.internet.url() },
            fields: [{ field: 'url', badValue: 'noturl' }],
            required: ['url'],
            extraFieldKey: 'id',
        };
        testZodSchema(config);
    });
    describe('Update video schema', () => {
        const config = {
            schema: updateVideoSchema,
            validInput: {
                customTitle: 'Video one',
                customDescription: 'This is a description example.',
            },
            fields: [
                { field: 'customTitle', badValue: 2 },
                { field: 'customDescription', badValue: 2 },
            ],
            required: [],
            extraFieldKey: 'id',
        };

        testZodSchema(config);

        test('Requires at least one field', () => {
            const res = updateVideoSchema.safeParse({});

            expect(res.success).toBe(false);
        });

        test('Accepts custom title only', () => {
            const res = updateVideoSchema.safeParse({
                customTitle: 'Video one',
            });

            expect(res.success).toBe(true);
        });

        test('Accepts custom description only', () => {
            const res = updateVideoSchema.safeParse({
                customDescription: 'This is a description example.',
            });

            expect(res.success).toBe(true);
        });
    });

    describe('Playlist video reference schema', () => {
        const config = {
            schema: playlistVideoRefSchema,
            validInput: {
                playlistId: randomUUID(),
                videoId: randomUUID(),
            },
            fields: [
                { field: 'playlistId', badValue: 'abc' },
                { field: 'videoId', badValue: 'abc' },
            ],
            required: ['playlistId', 'videoId'],
            extraFieldKey: 'id',
        };

        testZodSchema(config);
    });
});
