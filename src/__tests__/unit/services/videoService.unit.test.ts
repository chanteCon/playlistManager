import {
    buildMetadata,
    buildVideo,
    buildVideoWithSource,
} from '__tests__/shared/factories/videoFactory';
import { mockVideoRepo } from '__tests__/shared/mocks/repos';
import { mockVideoMetadataService } from '__tests__/shared/mocks/services';
import { randomUUID } from 'crypto';
import { createVideoService } from 'features/video/services/videoService';

const videoService = createVideoService({
    videoRepo: mockVideoRepo,
    videoMetadataService: mockVideoMetadataService,
});
const testUrl = 'https://www.tiktok.com/@cloverthisismycat/video/7234514172778777874';

describe('Video Service unit tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Add from url', () => {
        test.each([
            {
                name: 'valid youtube url',
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                expectedPlatform: 'youtube',
                expectedPlatformId: 'dQw4w9WgXcQ',
                expectedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            },
            {
                name: 'valid short youtube url',
                url: 'https://youtu.be/dQw4w9WgXcQ',
                expectedPlatform: 'youtube',
                expectedPlatformId: 'dQw4w9WgXcQ',
                expectedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            },
            {
                name: 'valid youtube shorts url',
                url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
                expectedPlatform: 'youtube',
                expectedPlatformId: 'dQw4w9WgXcQ',
                expectedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            },
            {
                name: 'valid tiktok web url',
                url: 'https://www.tiktok.com/@cloverthisismycat/video/7234514172778777874',
                expectedPlatform: 'tiktok',
                expectedPlatformId: '7234514172778777874',
                expectedUrl: 'https://www.tiktok.com/@cloverthisismycat/video/7234514172778777874',
            },
            {
                name: 'valid tiktok mobile url',
                url: 'https://vt.tiktok.com/ZS48Twksn/',
                expectedPlatform: 'tiktok',
                expectedPlatformId: 'ZS48Twksn',
                expectedUrl: 'https://vt.tiktok.com/ZS48Twksn/',
            },
        ])(
            'Should add normalised url with platform data and fetch metadata for $name',
            async ({ url, expectedPlatform, expectedPlatformId, expectedUrl }) => {
                mockVideoRepo.findByUrl.mockResolvedValueOnce(null);
                mockVideoRepo.findByPlatformIdentity.mockResolvedValueOnce(null);
                mockVideoMetadataService.getExternalData.mockResolvedValue({
                    url: expectedUrl,
                    metadata: { title: 'test title' },
                    platformId: expectedPlatformId,
                });

                await videoService.addFromUrl(url);

                expect(mockVideoMetadataService.getExternalData).toHaveBeenCalledWith(expectedUrl);
                const expectedVideo = {
                    url: expectedUrl,
                    canonicalUrl: expectedUrl,
                    platformIdentity: {
                        platform: expectedPlatform,
                        platformId: expectedPlatformId,
                    },
                    metadata: {
                        title: 'test title',
                    },
                };

                expect(mockVideoRepo.ensureExists).toHaveBeenCalledWith(
                    expect.objectContaining(expectedVideo),
                );
            },
        );
        test('Should add url with platform data if valid url with undefined metadata', async () => {
            const expectedVideo = {
                url: testUrl,
                platformIdentity: {
                    platform: 'tiktok',
                    platformId: '7234514172778777874',
                },
            };
            mockVideoRepo.findByPlatformIdentity.mockResolvedValueOnce(null);
            mockVideoRepo.findByUrl.mockResolvedValueOnce(null);
            mockVideoMetadataService.getExternalData.mockResolvedValueOnce(undefined);
            await videoService.addFromUrl(testUrl);
            expect(mockVideoMetadataService.getExternalData).toHaveBeenCalledWith(testUrl);
            expect(mockVideoRepo.ensureExists).toHaveBeenCalledWith(
                expect.objectContaining(expectedVideo),
            );
        });
        test('Should return existing video without fetching metadata', async () => {
            const storedVideo = buildVideo({ url: testUrl });
            mockVideoRepo.findByUrl.mockResolvedValueOnce(storedVideo);
            await videoService.addFromUrl(testUrl);
            expect(mockVideoRepo.findByPlatformIdentity).not.toHaveBeenCalled();
            expect(mockVideoMetadataService.getExternalData).not.toHaveBeenCalled();
            expect(mockVideoRepo.ensureExists).not.toHaveBeenCalled();
        });
        test('Should store input URL without platform identity for unknown host', async () => {
            mockVideoRepo.findByUrl.mockResolvedValueOnce(null);
            const url = 'https://unknown-host.com';
            await videoService.addFromUrl(url);
            expect(mockVideoRepo.ensureExists).toHaveBeenCalledWith(
                expect.objectContaining({ url }),
            );
            expect(mockVideoRepo.findByPlatformIdentity).not.toHaveBeenCalled();
        });
        test('Should treat spoofed platform hostname as unknown host', async () => {
            mockVideoRepo.findByUrl.mockResolvedValueOnce(null);
            const url = 'https://youtubee.com';
            await videoService.addFromUrl(url);
            expect(mockVideoRepo.ensureExists).toHaveBeenCalledWith(
                expect.objectContaining({ url }),
            );
        });
        test('Should throw error if youtube id not valid format', async () => {
            mockVideoRepo.findByUrl.mockResolvedValueOnce(null);
            const url = 'https://www.youtube.com/watch?v=invalid.id';
            await expect(videoService.addFromUrl(url)).rejects.toThrow('url format not supported');
        });
        test('Should throw error if tiktok id not valid format', async () => {
            mockVideoRepo.findByUrl.mockResolvedValueOnce(null);
            const url = 'https://www.tiktok.com/@cloverthisismycat/video/invalid.id';
            await expect(videoService.addFromUrl(url)).rejects.toThrow('url format not supported');
        });
        test('Should not identify platform if if could not extract platform id', async () => {
            mockVideoRepo.findByUrl.mockResolvedValueOnce(null);
            const url = 'https://www.tiktok.com/@cloverthisismycat/video/';
            await videoService.addFromUrl(url);
            expect(mockVideoRepo.ensureExists).toHaveBeenCalledWith(
                expect.objectContaining({ url }),
            );
            expect(mockVideoRepo.findByPlatformIdentity).not.toHaveBeenCalled();
        });
        test('Should throw error if url is not a valid url', async () => {
            mockVideoRepo.findByUrl.mockResolvedValueOnce(null);
            const url = 'not url';
            await expect(videoService.addFromUrl(url)).rejects.toThrow('url format not supported');
        });
        test('Should throw error if tiktok uisername is not a valid', async () => {
            mockVideoRepo.findByUrl.mockResolvedValueOnce(null);
            const url = 'https://www.tiktok.com/@hello/video/123456789!';
            await expect(videoService.addFromUrl(url)).rejects.toThrow('url format not supported');
        });
    });
    describe('Find by id', () => {
        test('Should return video from repo if exists', async () => {
            const expectedVideo = buildVideo({ url: testUrl });
            mockVideoRepo.findById.mockResolvedValueOnce(expectedVideo);
            const video = await videoService.findById(expectedVideo.id);
            expect(video).toEqual(expectedVideo);
        });
        test('Should throw not found error if the video does not exist', async () => {
            mockVideoRepo.findById.mockResolvedValueOnce(null);
            await expect(videoService.findById).rejects.toThrow('video not found');
        });
    });
    describe('Get fresh by id', () => {
        test('Should return updated video after refreshing stale metadata', async () => {
            const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            const newData = buildMetadata();
            const oldVideo = buildVideoWithSource({ sourceOverrides: { updatedAt: twoMonthsAgo } });
            mockVideoRepo.findById.mockResolvedValueOnce(oldVideo);
            mockVideoMetadataService.getExternalData.mockResolvedValueOnce({
                url: oldVideo.url,
                metadata: newData,
            });
            mockVideoRepo.updateSourceData.mockResolvedValueOnce({
                ...oldVideo.source!,
                ...newData,
                updatedAt: new Date(),
            });
            const result = await videoService.getFreshById(oldVideo.id);
            expect(result.id).toEqual(oldVideo.id);
            const resultSource = result.source!;
            expect(resultSource.title).not.toEqual(oldVideo.source!.title);
            expect(resultSource.title).toEqual(newData.title);
            expect(resultSource.updatedAt).not.toEqual(twoMonthsAgo);
        });
        test('Should return original video if metadata not stale', async () => {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const originalVideo = buildVideoWithSource({
                sourceOverrides: { updatedAt: sevenDaysAgo },
            });
            mockVideoRepo.findById.mockResolvedValueOnce(originalVideo);
            const result = await videoService.getFreshById(originalVideo.id);
            expect(mockVideoMetadataService.getExternalData).toHaveBeenCalledTimes(0);
            expect(mockVideoRepo.updateSourceData).toHaveBeenCalledTimes(0);
            expect(result.id).toEqual(originalVideo.id);
            const resultSource = result.source!;
            expect(resultSource.title).toEqual(originalVideo.source!.title);
            expect(resultSource.updatedAt).toEqual(sevenDaysAgo);
        });
        test('Should return original video if there is no video source', async () => {
            const originalVideo = buildVideo();
            mockVideoRepo.findById.mockResolvedValueOnce(originalVideo);
            mockVideoRepo.touchSource.mockResolvedValueOnce(originalVideo.source!);
            const result = await videoService.getFreshById(originalVideo.id);
            expect(mockVideoMetadataService.getExternalData).toHaveBeenCalledTimes(0);
            expect(mockVideoRepo.updateSourceData).toHaveBeenCalledTimes(0);
            expect(result.id).toEqual(originalVideo.id);
            expect(result.source).toBeNull();
        });
        test('Should throw not found error if video is not found', async () => {
            mockVideoRepo.findById.mockResolvedValueOnce(null);
            await expect(videoService.getFreshById(randomUUID())).rejects.toThrow(
                'video not found',
            );
        });
        test('Should return original video if fetching metadata returns undefined', async () => {
            const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            const oldVideo = buildVideoWithSource({
                sourceOverrides: { updatedAt: twoMonthsAgo },
            });
            mockVideoRepo.findById.mockResolvedValueOnce(oldVideo);
            mockVideoMetadataService.getExternalData.mockResolvedValueOnce(undefined);
            const result = await videoService.getFreshById(oldVideo.id);
            expect(mockVideoMetadataService.getExternalData).toHaveBeenCalledTimes(1);
            expect(mockVideoRepo.updateSourceData).toHaveBeenCalledTimes(0);
            expect(result.id).toEqual(oldVideo.id);
            const resultSource = result.source!;
            expect(resultSource.title).toEqual(oldVideo.source!.title);
            expect(resultSource.updatedAt).toEqual(twoMonthsAgo);
        });
    });
});
