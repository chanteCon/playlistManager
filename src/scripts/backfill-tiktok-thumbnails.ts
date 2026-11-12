import { createPrismaClient } from 'database/prisma/prisma';
import { createVideoMetadataService } from 'features/video/services/videoMetadataService';
import { logger } from 'shared/logger/logger';
const main = async () => {
    const prisma = createPrismaClient(process.env.DATABASE_URL!);
    try {
        const sources = await prisma.videoSource.findMany({
            where: {
                platform: 'tiktok',
            },
            take: 5,
        });

        const { getTikTokMetadata } = createVideoMetadataService();

        for (const source of sources) {
            try {
                const metadata = await getTikTokMetadata(source.canonicalUrl);

                await prisma.videoSource.update({
                    where: { id: source.id },
                    data: {
                        thumbnail: metadata.thumbnail,
                    },
                });

                logger.log({ sourceId: source.id }, 'TikTok thumbnail updated');
            } catch (error) {
                logger.error({ error, sourceId: source.id }, 'Failed to update TikTok thumbnail');
            }
        }
    } catch (error) {
        logger.error({ error }, 'TikTok thumbnail backfill failed');
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
};

void main();
