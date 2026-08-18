import { sendMailMock } from '__tests__/shared/mocks/mockSendMail';
jest.mock('features/video/services/videoMetadataService', () => ({
    createVideoMetadataService: jest.fn(() => ({
        getExternalData: jest.fn().mockResolvedValue({
            undefined,
        }),
    })),
}));
import { buildUserInput } from '__tests__/shared/factories';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { extractCodeFromLastEmail, setAuthHeader } from '__tests__/e2e/helpers/e2eTestHelpers';
import { createTestApp, TestAppEnv } from '__tests__/setup/e2e';
import { authPaths, playlistPaths } from 'routes/path';
import request from 'supertest';

let testEnv: TestAppEnv;

beforeAll(async () => {
    testEnv = await createTestApp();
});

afterAll(async () => {
    await testEnv.teardown();
});

beforeEach(async () => {
    jest.clearAllMocks();
    await truncateDbTables(testEnv.db);
    await testEnv.redis.flushDb();
});
describe('Full flow, playlist tests', () => {
    test('Full user flow: register → verify → login MFA → create playlist → add video → update → delete', async () => {
        const userData = buildUserInput();

        // register
        const registerRes = await request(testEnv.app).post(authPaths.register).send(userData);
        expect(registerRes.status).toBe(201);

        // verify user
        const verifyRes = await request(testEnv.app)
            .patch(authPaths.verify)
            .send({ code: extractCodeFromLastEmail(sendMailMock) });

        expect(verifyRes.status).toBe(200);
        const { accessToken } = verifyRes.body.data;

        // create playlist
        const createPlaylistRes = await setAuthHeader({
            req: request(testEnv.app).post(playlistPaths.base),
            accessToken,
        }).send({ name: 'My Playlist' });

        expect(createPlaylistRes.status).toBe(201);

        expect(createPlaylistRes.body.data).toEqual(
            expect.objectContaining({
                playlist: expect.objectContaining({
                    name: 'My Playlist',
                }),
            }),
        );
        const { playlist } = createPlaylistRes.body.data;
        // add video
        const videoUrl = 'https://www.youtube.com/watch?v=zzzzzzzzzzz';
        const addVideoRes = await setAuthHeader({
            req: request(testEnv.app).post(playlistPaths.videoBase(playlist.id)),
            accessToken,
        }).send({
            url: videoUrl,
        });

        expect(addVideoRes.status).toBe(201);

        // retrieve playlist and verify video was added
        const getPlaylistRes = await setAuthHeader({
            req: request(testEnv.app).get(playlistPaths.id(playlist.id)),
            accessToken,
        }).send();

        expect(getPlaylistRes.status).toBe(200);
        expect(getPlaylistRes.body.data.playlist).toEqual(
            expect.objectContaining({
                id: playlist.id,
                name: 'My Playlist',
                videos: [
                    expect.objectContaining({
                        id: expect.any(String),
                        title: '',
                        description: '',
                        thumbnail: '',
                        url: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
                        platform: null,
                        platformId: null,
                        render: false,
                    }),
                ],
            }),
        );

        expect(getPlaylistRes.body.data.playlist.videos).toHaveLength(1);

        // update playlist
        const updatePlaylistRes = await setAuthHeader({
            req: request(testEnv.app).patch(playlistPaths.id(playlist.id)),
            accessToken,
        }).send({ name: 'Updated Playlist' });

        expect(updatePlaylistRes.status).toBe(200);
        expect(updatePlaylistRes.body.data.playlist).toEqual(
            expect.objectContaining({
                id: playlist.id,
                name: 'Updated Playlist',
            }),
        );

        // delete playlist
        const deletePlaylistRes = await setAuthHeader({
            req: request(testEnv.app).delete(playlistPaths.id(playlist.id)),
            accessToken,
        }).send();

        expect(deletePlaylistRes.status).toBe(204);

        // verify playlist no longer exists
        const deletedPlaylistRes = await setAuthHeader({
            req: request(testEnv.app).get(playlistPaths.id(playlist.id)),
            accessToken,
        }).send();

        expect(deletedPlaylistRes.status).toBe(404);
    });
});
