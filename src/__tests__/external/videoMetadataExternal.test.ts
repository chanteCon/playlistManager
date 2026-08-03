import { createVideoMetadataService } from '../../features/video/services/videoMetadataService';
const videoMetadataService = createVideoMetadataService();
describe('Video metadata service', () => {
    describe('getExternalData', () => {
        test('Should return metadata for valid URL', async () => {
            const testUrl = 'https://www.tiktok.com/@cats_vedious/video/7669157689716378910';
            const result = await videoMetadataService.getExternalData(testUrl);
            expect(result).toBeDefined();
        });
    });
});
