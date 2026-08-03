import { VideoRepo } from 'features/video/repos/videoRepo';

export const mockVideoRepo: jest.Mocked<VideoRepo> = {
    findById: jest.fn(),
    ensureExists: jest.fn(),
    findByUrl: jest.fn(),
    updateSourceData: jest.fn(),
    findByPlatformIdentity: jest.fn(),
    touchSource: jest.fn(),
};
