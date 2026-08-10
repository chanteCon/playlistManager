import { buildExpressMocks } from '__tests__/shared/mocks/expressMock';
import { mockPlaylistService } from '__tests__/shared/mocks/services';
import { createPlaylistController } from 'features/playlist/controllers/playlistController';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { expectMockResponse } from '__tests__/shared/helpers/controllerAssertions';
import { buildPlaylist } from '__tests__/shared/factories';
import { AuthRequest } from 'features/auth/types';

const playlistController = createPlaylistController(mockPlaylistService);
let mockReq: AuthRequest;
const userId = randomUUID();
const error = new Error('Service error');
const playlists = [buildPlaylist()];

describe('Unit tests: playlist controller', () => {
    let mockRes: Response;
    beforeEach(() => {
        jest.clearAllMocks();
        ({ mockRes } = buildExpressMocks());
        mockReq = { user: { id: userId } } as unknown as AuthRequest;
    });

    describe('Get all user playlists', () => {
        test('Returns 200 and user playlists', async () => {
            mockPlaylistService.getUserPlaylists.mockResolvedValueOnce(playlists);
            await playlistController.getAllUserPlaylists(mockReq, mockRes);
            expectMockResponse({ mockRes, status: 200, json: true, data: { playlists } });
            expect(mockPlaylistService.getUserPlaylists).toHaveBeenCalledWith(userId);
        });
        test('Throws service layer error', async () => {
            mockPlaylistService.getUserPlaylists.mockRejectedValueOnce(error);
            await expect(playlistController.getAllUserPlaylists(mockReq, mockRes)).rejects.toThrow(
                error,
            );
            expect(mockPlaylistService.getUserPlaylists).toHaveBeenCalledWith(userId);
        });
    });
    describe('Create playlist', () => {
        const playlist = playlists[0];

        beforeEach(() => {
            mockReq.body = { name: playlist.name };
        });
        test('Returns 201 and created playlist', async () => {
            mockPlaylistService.create.mockResolvedValueOnce(playlist);
            await playlistController.createPlaylist(mockReq, mockRes);
            expectMockResponse({ mockRes, status: 201, json: true, data: { playlist } });
            expect(mockPlaylistService.create).toHaveBeenCalledWith(userId, {
                name: playlist.name,
            });
        });
        test('Throws service layer error', async () => {
            mockPlaylistService.create.mockRejectedValueOnce(error);
            await expect(playlistController.createPlaylist(mockReq, mockRes)).rejects.toThrow(
                error,
            );
            expect(mockPlaylistService.create).toHaveBeenCalledWith(userId, {
                name: playlist.name,
            });
        });
    });
    describe('Get playlist', () => {
        const { id, name } = playlists[0];
        const playlistDTO = {
            id,
            name,
            videos: [],
        };
        beforeEach(() => {
            mockReq.params = { playlistId: id };
        });
        test('Returns 200 and playlist DTO', async () => {
            mockPlaylistService.getPlaylistById.mockResolvedValueOnce(playlistDTO);
            await playlistController.getPlaylist(mockReq, mockRes);
            expectMockResponse({
                mockRes,
                status: 200,
                json: true,
                data: { playlist: playlistDTO },
            });
            expect(mockPlaylistService.getPlaylistById).toHaveBeenCalledWith(userId, id);
        });
        test('Throws service layer error', async () => {
            mockPlaylistService.getPlaylistById.mockRejectedValueOnce(error);
            await expect(playlistController.getPlaylist(mockReq, mockRes)).rejects.toThrow(error);
            expect(mockPlaylistService.getPlaylistById).toHaveBeenCalledWith(userId, id);
        });
    });
    describe('Update playlist', () => {
        const { id, name } = playlists[0];
        beforeEach(() => {
            mockReq.params = { playlistId: id };
            mockReq.body = { name };
        });
        test('Returns 200 and updated playlist', async () => {
            mockPlaylistService.update.mockResolvedValueOnce(playlists[0]);
            await playlistController.updatePlaylist(mockReq, mockRes);
            expectMockResponse({
                mockRes,
                status: 200,
                json: true,
                data: { playlist: playlists[0] },
            });
            expect(mockPlaylistService.update).toHaveBeenLastCalledWith(userId, id, {
                name,
            });
        });
        test('Throws service layer error', async () => {
            mockPlaylistService.update.mockRejectedValueOnce(error);
            await expect(playlistController.updatePlaylist(mockReq, mockRes)).rejects.toThrow(
                error,
            );
            expect(mockPlaylistService.update).toHaveBeenLastCalledWith(userId, id, {
                name,
            });
        });
    });
    describe('Delete playlist', () => {
        const { id } = playlists[0];

        beforeEach(() => {
            mockReq.params = { playlistId: id };
        });
        test('Returns 204', async () => {
            mockPlaylistService.remove.mockResolvedValueOnce(playlists[0]);
            await playlistController.deletePlaylist(mockReq, mockRes);
            expectMockResponse({ mockRes, status: 204, json: false });
            expect(mockPlaylistService.remove).toHaveBeenCalledWith(userId, id);
        });
        test('Throws service layer errors', async () => {
            mockPlaylistService.remove.mockRejectedValueOnce(error);
            await expect(playlistController.deletePlaylist(mockReq, mockRes)).rejects.toThrow(
                error,
            );
            expect(mockPlaylistService.remove).toHaveBeenCalledWith(userId, id);
        });
    });
});
