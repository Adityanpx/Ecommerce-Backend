import { Prisma, Setting } from '@prisma/client';
import { prisma } from '../config/database';

type Client = Prisma.TransactionClient | typeof prisma;

export const settingsRepository = {
  findAll(): Promise<Setting[]> {
    return prisma.setting.findMany({ orderBy: { key: 'asc' } });
  },

  findByKey(key: string): Promise<Setting | null> {
    return prisma.setting.findUnique({ where: { key } });
  },

  upsert(key: string, value: Prisma.InputJsonValue): Promise<Setting> {
    return prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  },

  upsertMany(entries: { key: string; value: Prisma.InputJsonValue }[]) {
    return prisma.$transaction(
      entries.map((e) =>
        prisma.setting.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value },
        }),
      ),
    );
  },

  /**
   * Atomically increments a numeric setting and returns the value BEFORE
   * incrementing. One statement, so two concurrent checkouts can never
   * receive the same sequence number.
   *
   * `value #>> '{}'` extracts a jsonb scalar as text; casting to int lets
   * PostgreSQL do the arithmetic.
   */
  async nextSequence(key: string, client: Client = prisma): Promise<number> {
    const rows = await client.$queryRaw<{ seq: number }[]>`
      UPDATE settings
      SET value = to_jsonb(((value #>> '{}')::int + 1)),
          updated_at = NOW()
      WHERE key = ${key}
      RETURNING ((value #>> '{}')::int - 1) AS seq
    `;

    if (rows.length === 0) {
      throw new Error(`Sequence setting "${key}" not found. Run the seeder.`);
    }
    return rows[0].seq;
  },
};
