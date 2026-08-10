import { expectMockResponse } from '__tests__/shared/helpers/controllerAssertions';
import { buildExpressMocks } from '__tests__/shared/mocks/expressMock';
import { mockPlaylistService } from '__tests__/shared/mocks/services';
import { randomUUID } from 'crypto';
import { AuthRequest } from 'features/auth/types';
import { createPlaylistVideoController } from 'features/playlist/controllers/playlistVideoController';

const playlistVideoController = createPlaylistVideoController(mockPlaylistService);
const userId = randomUUID();
const url = 'testUrl.com';
const playlistId = randomUUID();
const videoDTO = {
    id: randomUUID(),
    title: 'Test video',
    url,
    render: true,
};
const { mockRes } = buildExpressMocks();
const mockReq = { user: { id: userId } } as unknown as AuthRequest;
const error = new Error('Service error');
describe('Unit tests: Playlist video controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Add video', () => {
        beforeEach(() => {
            mockReq.body = { url };
            mockReq.params = { playlistId };
        });
        test('Returns 201 and playlist Video DTO', async () => {
            mockPlaylistService.addVideo.mockResolvedValueOnce(videoDTO);
            await playlistVideoController.addVideo(mockReq, mockRes);
            expectMockResponse({ mockRes, status: 201, json: true, data: { video: videoDTO } });
            expect(mockPlaylistService.addVideo).toHaveBeenCalledWith(userId, { playlistId, url });
        });
        test('Throws service layer error', async () => {
            mockPlaylistService.addVideo.mockRejectedValueOnce(error);
            await expect(playlistVideoController.addVideo(mockReq, mockRes)).rejects.toThrow(error);
        });
    });
    describe('Update video', () => {
        beforeEach(() => {
            mockReq.body = { title: videoDTO.title };
            mockReq.params = { playlistId };
        });

        test('Returns 200 and updated video', async () => {
            mockPlaylistService.updateVideo.mockResolvedValueOnce(videoDTO);
            await playlistVideoController.updateVideo(mockReq, mockRes);
            expectMockResponse({ mockRes, status: 200, json: true, data: { video: videoDTO } });
            await playlistVideoController.updateVideo(mockReq, mockRes);
        });
        test('Throws service layer error', async () => {
            mockPlaylistService.updateVideo.mockRejectedValueOnce(error);
            await expect(playlistVideoController.updateVideo(mockReq, mockRes)).rejects.toThrow(
                error,
            );
        });
    });
    describe('Remove video', () => {
        beforeEach(() => {
            mockReq.params = { playlistId };
        });
        test('Returns 204', async () => {
            mockPlaylistService.updateVideo.mockResolvedValueOnce(videoDTO);
            await playlistVideoController.deleteVideo(mockReq, mockRes);
            expectMockResponse({ mockRes, status: 204, json: false });
            await playlistVideoController.updateVideo(mockReq, mockRes);
        });
        test('Throws service layer error', async () => {
            mockPlaylistService.removeVideo.mockRejectedValueOnce(error);
            await expect(playlistVideoController.deleteVideo(mockReq, mockRes)).rejects.toThrow(
                error,
            );
        });
    });
});
