import { PrismaClient } from '@prisma/client';
import { seedSettings } from './settings.seed';
import { seedAdmin } from './admin.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Seeding database...\n');

  await seedSettings(prisma);
  await seedAdmin(prisma);

  // Phase 2 adds: categories.seed.ts, attributes.seed.ts, products.seed.ts

  // eslint-disable-next-line no-console
  console.log('\nSeeding complete.');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
