import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      whatsappPhone: true,
      whatsappAccountId: true,
      status: true,
    },
  });

  console.log('Active Tenants:');
  console.log(JSON.stringify(tenants, null, 2));

  if (tenants.length === 0) {
    console.log('No active tenants found');
  } else {
    console.log(`\nFound ${tenants.length} active tenant(s)`);
    tenants.forEach((t) => {
      console.log(`- ${t.name} (${t.slug}): whatsappPhone="${t.whatsappPhone}"`);
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
