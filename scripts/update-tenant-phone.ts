import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bakery = await prisma.tenant.findUnique({
    where: { slug: 'abc-bakery' },
  });

  if (!bakery) {
    console.error('Bakery tenant not found');
    process.exit(1);
  }

  console.log('Current Bakery tenant:');
  console.log(`- whatsappPhone: ${bakery.whatsappPhone}`);
  console.log(`- whatsappAccountId: ${bakery.whatsappAccountId}`);

  const updated = await prisma.tenant.update({
    where: { slug: 'abc-bakery' },
    data: { whatsappPhone: '9373690029' },
  });

  console.log('\nUpdated Bakery tenant:');
  console.log(`- whatsappPhone: ${updated.whatsappPhone}`);
  console.log(`- whatsappAccountId: ${updated.whatsappAccountId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
