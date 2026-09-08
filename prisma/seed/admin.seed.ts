import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

export async function seedAdmin(prisma: PrismaClient): Promise<void> {
  const email = 'admin@sportstore.com';
  const plainPassword = 'Admin@123456';

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log('  Admin already exists — skipped');
    return;
  }

  await prisma.admin.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(plainPassword, 12),
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  // eslint-disable-next-line no-console
  console.log(`  Created admin: ${email} / ${plainPassword}`);
  // eslint-disable-next-line no-console
  console.log('  CHANGE THIS PASSWORD BEFORE PRODUCTION');
}
