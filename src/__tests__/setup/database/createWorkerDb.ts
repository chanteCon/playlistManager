import { Client } from 'pg';
import { logger } from 'shared/logger/logger';

beforeAll(async () => {
    const client = new Client({
        connectionString: process.env.CONTAINER_URI,
    });

    await client.connect();

    try {
        const workerDb = `test_db_${process.env.JEST_WORKER_ID}`;

        const workerExists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [
            workerDb,
        ]);

        if (workerExists.rowCount === 0) {
            await client.query(`CREATE DATABASE "${workerDb}" TEMPLATE test_db_template`);
        }
    } catch (error) {
        logger.error('error setting up test database', error);
    } finally {
        await client.end();
    }
});
