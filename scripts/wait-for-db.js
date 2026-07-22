const { execSync } = require('child_process');
const { promisify } = require('util');

const sleep = promisify(setTimeout);

(async () => {
    const MAX = 30;

    console.log('Waiting for Postgres...');
    for (let i = 0; i < MAX; i++) {
        try {
            const output = execSync('docker exec postgres-db pg_isready -U postgres', {
                encoding: 'utf-8',
                stdio: 'pipe',
            });

            if (output.includes('accepting connections')) {
                console.log('Postgres is ready!');
                return;
            }
        } catch {
            // do nothing
        }

        await sleep(1000);
    }

    console.error('Postgres did not start in time!');
    process.exit(1);
})();
