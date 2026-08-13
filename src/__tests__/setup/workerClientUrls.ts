process.env.DATABASE_URL = `${process.env.DB_CONTAINER_URI}_${process.env.JEST_WORKER_ID}`;
process.env.REDIS_URL = `${process.env.REDIS_CONTAINER_URI}/${process.env.JEST_WORKER_ID}`;
