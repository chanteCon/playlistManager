const sources = await prisma.videoSource.findMany({
    where: {
        platform: 'tiktok',
    },
});

for (const source of sources) {
    try {
        const metadata = await getTikTokMetadata(source.canonicalUrl);

        await prisma.videoSource.update({
            where: { id: source.id },
            data: {
                thumbnail: metadata.thumbnail,
            },
        });

        logger.info({ sourceId: source.id }, 'TikTok thumbnail updated');
    } catch (error) {
        logger.error({ error, sourceId: source.id }, 'Failed to update TikTok thumbnail');
    }
}
