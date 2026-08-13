import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { Client } from 'pg';

export default async function globalSetup() {
    console.log('Starting Redis container...');
    const redisContainer = await new RedisContainer('redis:7.2').start();
    process.env.REDIS_CONTAINER_URI = redisContainer.getConnectionUrl();
    console.log('Starting Testcontainers Postgres...');

    const dbContainer = await new PostgreSqlContainer('postgres:16')
        .withDatabase('test_db')
        .start();

    const connectionUri = dbContainer.getConnectionUri();
    process.env.DB_CONTAINER_URI = connectionUri;

    const global = globalThis as typeof globalThis & {
        postgresContainer: typeof dbContainer;
        redisContainer: typeof redisContainer;
    };

    global.postgresContainer = dbContainer;
    global.redisContainer = redisContainer;
    const templateUrl = `${connectionUri}_template`;
    const client = new Client({ connectionString: connectionUri });
    await client.connect();

    try {
        await client.query(`CREATE DATABASE "test_db_template"`);
        execSync('npx prisma migrate deploy', {
            env: {
                ...process.env,
                DATABASE_URL: templateUrl,
            },
        });
    } catch (error: any) {
        console.error(error);
        throw error;
    } finally {
        await client.end();
    }
}
