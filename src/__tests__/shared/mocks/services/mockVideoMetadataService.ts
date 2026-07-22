import { VideoMetadataService } from 'features/video/services/videoMetadataService';

export const mockVideoMetadataService: jest.Mocked<VideoMetadataService> = {
    getExternalData: jest.fn(),
};
