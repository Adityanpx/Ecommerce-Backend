import { prisma } from '../config/database';
import { DASHBOARD } from '../config/constants';

const REVENUE_STATUSES = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'] as const;

export const dashboardRepository = {
  async snapshot(from: Date, to: Date) {
    const [orderCount, revenue, newCustomers, pendingOrders, pendingReturns, totalCustomers] =
      await prisma.$transaction([
        prisma.order.count({
          where: { createdAt: { gte: from, lte: to }, status: { in: [...REVENUE_STATUSES] } },
        }),
        prisma.order.aggregate({
          where: { createdAt: { gte: from, lte: to }, status: { in: [...REVENUE_STATUSES] } },
          _sum: { totalAmount: true },
        }),
        prisma.user.count({ where: { createdAt: { gte: from, lte: to } } }),
        prisma.order.count({ where: { status: { in: ['PLACED', 'CONFIRMED'] } } }),
        prisma.return.count({ where: { status: 'REQUESTED' } }),
        prisma.user.count(),
      ]);

    return {
      orderCount,
      revenue: Number(revenue._sum.totalAmount ?? 0),
      newCustomers,
      pendingOrders,
      pendingReturns,
      totalCustomers,
    };
  },

  /**
   * Revenue grouped by day. Raw SQL because Prisma's groupBy cannot
   * truncate a timestamp to a date.
   */
  salesSeries(from: Date, to: Date) {
    return prisma.$queryRaw<{ day: Date; revenue: number; orders: bigint }[]>`
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        COALESCE(SUM(total_amount), 0)::float AS revenue,
        COUNT(*) AS orders
      FROM orders
      WHERE created_at >= ${from}
        AND created_at <= ${to}
        AND status IN ('PLACED','CONFIRMED','PACKED','SHIPPED','DELIVERED')
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  },

  async topProducts(from: Date, to: Date) {
    const grouped = await prisma.orderItem.groupBy({
      by: ['variantId', 'productName'],
      where: {
        order: { createdAt: { gte: from, lte: to }, status: { in: [...REVENUE_STATUSES] } },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: DASHBOARD.TOP_PRODUCTS_LIMIT,
    });

    return grouped.map((g) => ({
      variantId: g.variantId,
      productName: g.productName,
      unitsSold: g._sum.quantity ?? 0,
      revenue: Number(g._sum.lineTotal ?? 0),
    }));
  },

  topCategories(from: Date, to: Date) {
    return prisma.$queryRaw<{ name: string; revenue: number; units: bigint }[]>`
      SELECT
        sc.name AS name,
        COALESCE(SUM(oi.line_total), 0)::float AS revenue,
        COALESCE(SUM(oi.quantity), 0) AS units
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN product_variants pv ON pv.id = oi.variant_id
      JOIN products p ON p.id = pv.product_id
      JOIN sub_categories sc ON sc.id = p.sub_category_id
      WHERE o.created_at >= ${from}
        AND o.created_at <= ${to}
        AND o.status IN ('PLACED','CONFIRMED','PACKED','SHIPPED','DELIVERED')
      GROUP BY sc.name
      ORDER BY revenue DESC
      LIMIT 10
    `;
  },

  /**
   * Prisma cannot compare two columns directly, so the threshold comparison
   * is done in raw SQL.
   */
  lowStockVariants() {
    return prisma.$queryRaw<
      {
        id: string;
        sku: string;
        size: string | null;
        color: string | null;
        stock: number;
        threshold: number;
        productName: string;
      }[]
    >`
      SELECT
        pv.id, pv.sku, pv.size, pv.color, pv.stock,
        pv.low_stock_threshold AS threshold,
        p.name AS "productName"
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.is_active = true
        AND p.deleted_at IS NULL
        AND pv.stock <= pv.low_stock_threshold
      ORDER BY pv.stock ASC
      LIMIT ${DASHBOARD.LOW_STOCK_LIMIT}
    `;
  },

  recentOrders() {
    return prisma.order.findMany({
      where: { status: { not: 'PENDING_PAYMENT' } },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        guestEmail: true,
      },
      orderBy: { createdAt: 'desc' },
      take: DASHBOARD.RECENT_ORDERS_LIMIT,
    });
  },
};
