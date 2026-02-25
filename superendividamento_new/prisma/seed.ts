import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const defaultTenant = await prisma.tenant.upsert({
        where: { slug: 'escritorio-modelo' },
        update: {},
        create: {
            nome: 'Escritório Modelo',
            slug: 'escritorio-modelo',
        },
    });

    console.log({ defaultTenant });

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@escritorio.com' },
        update: {},
        create: {
            email: 'admin@escritorio.com',
            passwordHash: 'argon2shash...', // Placeholder
            nome: 'Administrador',
            role: 'ADMIN',
            tenantId: defaultTenant.id,
        },
    });

    console.log({ adminUser });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
