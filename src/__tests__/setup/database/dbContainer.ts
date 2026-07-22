import { PostgreSqlContainer } from '@testcontainers/postgresql';

export default async function globalSetup() {
    console.log('Starting Testcontainers Postgres...');

    const dbContainer = await new PostgreSqlContainer('postgres:16')
        .withDatabase('test_db')
        .start();

    const connectionUri = dbContainer.getConnectionUri();
    process.env.CONTAINER_URI = connectionUri;
}
