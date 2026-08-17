import { VideoMetadataService } from 'features/video/services/videoMetadataService';

export const mockVideoMetadataService: jest.Mocked<VideoMetadataService> = {
    getExternalData: jest.fn(),
};

jest.mock('features/video/services/videoMetadataService', () => ({
    createVideoMetadataService: jest.fn(() => mockVideoMetadataService),
}));
