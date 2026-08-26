import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { phone: '919999999999' },
  });

  if (!customer) {
    console.error('Customer with phone 919999999999 not found');
    process.exit(1);
  }

  console.log('Current customer:');
  console.log(`- id: ${customer.id}`);
  console.log(`- name: ${customer.name}`);
  console.log(`- phone: ${customer.phone}`);
  console.log(`- tenantId: ${customer.tenantId}`);

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { phone: '9373690029' },
  });

  console.log('\nUpdated customer:');
  console.log(`- id: ${updated.id}`);
  console.log(`- name: ${updated.name}`);
  console.log(`- phone: ${updated.phone}`);
  console.log(`- tenantId: ${updated.tenantId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
