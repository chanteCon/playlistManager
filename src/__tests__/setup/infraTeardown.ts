export default async function globalTeardown() {
    const global = globalThis as typeof globalThis & {
        postgresContainer?: {
            stop: () => Promise<unknown>;
        };
        redisContainer?: {
            stop: () => Promise<unknown>;
        };
    };

    if (global.postgresContainer) {
        console.log('Stopping Testcontainers Postgres...');
        await global.postgresContainer.stop();
        console.log('Postgres container stopped.');
    }

    if (global.redisContainer) {
        console.log('Stopping Testcontainers Redis...');
        await global.redisContainer.stop();
        console.log('Redis container stopped.');
    }
}
