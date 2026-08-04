/** @type {import("jest").Config} **/

module.exports = {
    testEnvironment: 'node',
    projects: [
        {
            displayName: 'unit',
            modulePaths: ['./src'],
            testRegex: '.*__tests__/unit/.*\\.test\\.ts$',
            setupFiles: ['./src/__tests__/setup/jest.setup.ts'],
            extensionsToTreatAsEsm: ['.ts'],
            transform: {
                '^.+\\.tsx?$': ['@swc/jest'],
            },
        },
        {
            displayName: 'integration_e2e',
            modulePaths: ['./src'],
            testRegex: [
                '.*__tests__/integration/.*\\.test\\.ts$',
                '.*__tests__/e2e/.*\\.test\\.ts$',
            ],
            globalSetup: './src/__tests__/setup/testContainersSetup.ts',
            globalTeardown: './src/__tests__/setup/infraTeardown.ts',
            setupFiles: [
                './src/__tests__/setup/jest.setup.ts',
                './src/__tests__/setup/workerClientUrls.ts',
            ],
            setupFilesAfterEnv: ['./src/__tests__/setup/createWorkerDb.ts'],
            extensionsToTreatAsEsm: ['.ts'],
            transform: {
                '^.+\\.tsx?$': ['@swc/jest'],
            },
        },
        {
            displayName: 'external',
            modulePaths: ['./src'],
            testRegex: '.*__tests__/external/.*\\.test\\.ts$',
            extensionsToTreatAsEsm: ['.ts'],
            transform: {
                '^.+\\.tsx?$': ['@swc/jest'],
            },
        },
    ],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageThreshold: {
        global: {
            branches: 90,
            functions: 95,
            lines: 95,
            statements: 95,
        },
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/server.ts',
        '!src/**/__tests__/**',
        '!src/database/**',
        '!src/features/video/services/videoMetadataService.ts',
        '!src/redis/**',
        '!src/features/*/repos/**',
        '!src/shared/**',
        '!src/app/**',
        '!src/config/**',
        '!src/database/**',
        '!src/redisClient/redis.ts',
        '!src/middleware/timeoutMiddleware.ts',
        '!src/**/types.ts',
    ],
};
