import { PrismaClient } from '@prisma/client';
import { DEFAULT_SETTINGS } from '../../src/config/constants';

export async function seedSettings(prisma: PrismaClient): Promise<void> {
  const entries = Object.entries(DEFAULT_SETTINGS);

  for (const [key, value] of entries) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as never },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`  Seeded ${entries.length} settings`);
}
