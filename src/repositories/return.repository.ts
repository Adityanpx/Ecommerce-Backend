import { Prisma, ReturnStatus } from '@prisma/client';
import { prisma } from '../config/database';

const returnInclude = {
  items: { include: { orderItem: true } },
  order: {
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      deliveredAt: true,
    },
  },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.ReturnInclude;

export const returnRepository = {
  async findMany(filters: { userId?: string; status?: ReturnStatus }, skip: number, take: number) {
    const where: Prisma.ReturnWhereInput = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;

    const [items, total] = await prisma.$transaction([
      prisma.return.findMany({
        where,
        include: returnInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.return.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.return.findUnique({ where: { id }, include: returnInclude });
  },

  countForOrder(orderId: string): Promise<number> {
    return prisma.return.count({ where: { orderId } });
  },

  create(data: Prisma.ReturnUncheckedCreateInput) {
    return prisma.return.create({ data, include: returnInclude });
  },

  update(id: string, data: Prisma.ReturnUpdateInput) {
    return prisma.return.update({ where: { id }, data, include: returnInclude });
  },
};
