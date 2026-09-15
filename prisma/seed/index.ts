import { PrismaClient } from '@prisma/client';
import { seedSettings } from './settings.seed';
import { seedAdmin } from './admin.seed';
import { seedCatalog } from './catalog.seed';
import { seedProducts } from './products.seed';
import { seedHomepage } from './homepage.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Seeding database...\n');

  await seedSettings(prisma);
  await seedAdmin(prisma);
  await seedCatalog(prisma);
  await seedProducts(prisma);
  await seedHomepage(prisma);

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
