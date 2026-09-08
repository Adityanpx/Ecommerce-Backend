import { Address, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const addressRepository = {
  findByUser(userId: string): Promise<Address[]> {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  },

  findById(id: string): Promise<Address | null> {
    return prisma.address.findUnique({ where: { id } });
  },

  create(data: Prisma.AddressUncheckedCreateInput): Promise<Address> {
    return prisma.address.create({ data });
  },

  update(id: string, data: Prisma.AddressUpdateInput): Promise<Address> {
    return prisma.address.update({ where: { id }, data });
  },

  delete(id: string): Promise<Address> {
    return prisma.address.delete({ where: { id } });
  },

  /** Only one default per user — clear the rest in the same transaction. */
  setDefault(userId: string, addressId: string) {
    return prisma.$transaction([
      prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      prisma.address.update({ where: { id: addressId }, data: { isDefault: true } }),
    ]);
  },

  count(userId: string): Promise<number> {
    return prisma.address.count({ where: { userId } });
  },
};
