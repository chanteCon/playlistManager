import { execSync } from 'child_process';
import { Client } from 'pg';

beforeAll(async () => {
    const client = new Client({
        connectionString: process.env.CONTAINER_URI,
    });

    await client.connect();
    try {
        await client.query(`CREATE DATABASE "${process.env.JEST_WORKER_ID}"`);
        execSync('npx prisma migrate deploy', {
            env: process.env,
        });
    } catch (error: any) {
        if (error?.code !== '42P04') {
            console.error(error);
        }
    } finally {
        await client.end();
    }
});
