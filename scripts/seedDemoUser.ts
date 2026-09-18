import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/shared/utils/hashing';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo123!';

async function main() {
    const passwordHash = await hashPassword(DEMO_PASSWORD);

    await prisma.user.upsert({
        where: {
            email: DEMO_EMAIL,
        },
        update: {},
        create: {
            email: DEMO_EMAIL,
            username: 'demo',
            password: passwordHash,
            verified: true,
            isDemo: true,
        },
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
