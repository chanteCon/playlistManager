import { VideoService } from 'features/video/services/videoService';

export const mockVideoService: jest.Mocked<VideoService> = {
    addFromUrl: jest.fn(),
    findById: jest.fn(),
    getFreshById: jest.fn(),
};
