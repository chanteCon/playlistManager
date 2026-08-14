import { createTestInfrastructure, InfraStructure } from '__tests__/setup/infrastructure';
import { createVideoServiceFixture } from '__tests__/setup/integration';
import { buildMetadata } from '__tests__/shared/factories/videoFactory';
import { truncateDbTables } from '__tests__/shared/helpers/dbHelpers';
import { mockVideoMetadataService } from '__tests__/shared/mocks/services';
import { seedVideoWithSource } from '__tests__/shared/seeds/seeds';
import { randomUUID } from 'crypto';
import {} from 'features/video/repos/videoRepo';
import { VideoService } from 'features/video/services/videoService';

let testEnv: InfraStructure & { videoService: VideoService };

beforeAll(async () => {
    const infra = await createTestInfrastructure();
    const videoService = createVideoServiceFixture({
        ...infra,
        videoMetadataService: mockVideoMetadataService,
    });
    testEnv = { ...infra, videoService };
});

afterAll(async () => {
    await testEnv.teardown();
});

describe('Video service integration tests', () => {
    const testUrl = 'https://www.tiktok.com/@cloverthisismycat/video/7234514172778777874';
    beforeEach(async () => {
        jest.clearAllMocks();
        await truncateDbTables(testEnv.db);
    });
    describe('Add from url', () => {
        test('creates video with source and metadata', async () => {
            const metadata = buildMetadata();
            mockVideoMetadataService.getExternalData.mockResolvedValueOnce({
                metadata,
                url: testUrl,
            });
            const result = await testEnv.videoService.addFromUrl(testUrl);
            const videoInDB = await testEnv.db.video.findUnique({
                where: { id: result.id },
                include: { source: true },
            });
            expect(videoInDB).not.toBeNull();
            expect(videoInDB!.source).not.toBeNull();

            const source = videoInDB!.source;
            expect(source?.platform).toEqual('tiktok');
            expect(source?.platformId).toEqual('7234514172778777874');
            expect(source?.description).toEqual(metadata.description);
            expect(source?.title).toEqual(metadata.title);
            expect(source?.thumbnail).toEqual(metadata.thumbnail);
        });
        test('creates video without source for unknown URL', async () => {
            const uknownUrl = 'https://unknownplatform.com/video/684531231231';
            const result = await testEnv.videoService.addFromUrl(uknownUrl);
            const videoInDB = await testEnv.db.video.findUnique({
                where: { id: result.id },
                include: { source: true },
            });
            expect(videoInDB).not.toBeNull();
            expect(videoInDB!.source).toBeNull();
        });
        test('returns existing video without duplicate creation', async () => {
            mockVideoMetadataService.getExternalData.mockResolvedValueOnce(undefined);
            await testEnv.videoService.addFromUrl(testUrl);
            const res1 = expect(await testEnv.db.video.findMany()).toHaveLength(1);
            await testEnv.videoService.addFromUrl(testUrl);
            const res2 = expect(await testEnv.db.video.findMany()).toHaveLength(1);
            expect(res1).toEqual(res2);
        });
        test('Uses existing source if source already exists', async () => {
            const fullUrl = 'https://www.youtube.com/watch?v=zzzzzzzzzzz';
            const shortUrl = 'https://www.youtube.com/shorts/zzzzzzzzzzz';
            const metadata = buildMetadata();
            mockVideoMetadataService.getExternalData.mockResolvedValueOnce({
                metadata,
                url: fullUrl,
            });
            const firstResult = await testEnv.videoService.addFromUrl(shortUrl);
            const secondResult = await testEnv.videoService.addFromUrl(fullUrl);
            expect(firstResult.sourceId).toEqual(secondResult.sourceId);
            expect(mockVideoMetadataService.getExternalData).toHaveBeenCalledTimes(1);
        });
        test('returns existing video without duplicate creation from extracting platform data', async () => {
            const fullUrl = 'https://www.youtube.com/watch?v=zzzzzzzzzzz';
            const shortUrl = 'https://www.youtube.com/shorts/zzzzzzzzzzz';
            const metadata = buildMetadata();
            mockVideoMetadataService.getExternalData.mockResolvedValueOnce({
                metadata,
                url: fullUrl,
            });
            const firstResult = await testEnv.videoService.addFromUrl(shortUrl);
            const secondResult = await testEnv.videoService.addFromUrl(fullUrl);
            expect(firstResult.sourceId).toEqual(secondResult.sourceId);
            expect(mockVideoMetadataService.getExternalData).toHaveBeenCalledTimes(1);
        });
    });
    describe('Find by id', () => {
        test('Returns existing video', async () => {
            const video = await seedVideoWithSource({ db: testEnv.db });
            const result = await testEnv.videoService.findById(video.id);
            expect(result).toEqual(video);
        });
        test('Throws error if video not found', async () => {
            await expect(testEnv.videoService.findById(randomUUID())).rejects.toThrow(
                'video not found',
            );
        });
    });
    describe('Get fresh by id', () => {
        test('updates stale video source data in database', async () => {
            const metadata = buildMetadata();
            mockVideoMetadataService.getExternalData.mockResolvedValueOnce({
                metadata,
                url: testUrl,
            });
            const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            const originalVideo = await seedVideoWithSource({
                db: testEnv.db,
                videoOverrides: { url: testUrl },
                sourceOverrides: { updatedAt: twoMonthsAgo },
            });
            const updateVideo = await testEnv.videoService.getFreshById(originalVideo.id);
            const source = updateVideo.source;
            expect(source!.id).toEqual(originalVideo.sourceId);
            expect(source?.updatedAt).not.toEqual(twoMonthsAgo);
            expect(source?.description).not.toEqual(originalVideo.source!.description);

            expect(source?.description).toEqual(metadata.description);
        });
        test('throws not found when video does not exist', async () => {
            await expect(testEnv.videoService.getFreshById(randomUUID())).rejects.toThrow(
                'video not found',
            );
        });
    });
});
