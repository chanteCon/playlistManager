import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { Client } from 'pg';

export default async function globalSetup() {
    console.log('Starting Testcontainers Postgres...');

    const dbContainer = await new PostgreSqlContainer('postgres:16')
        .withDatabase('test_db')
        .start();

    const connectionUri = dbContainer.getConnectionUri();
    process.env.CONTAINER_URI = connectionUri;
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
