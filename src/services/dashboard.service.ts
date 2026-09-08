import { endOfDay, startOfDay, subDays } from 'date-fns';
import { dashboardRepository } from '../repositories/dashboard.repository';

function parseRange(from?: string, to?: string): { from: Date; to: Date } {
  const toDate = to ? endOfDay(new Date(to)) : endOfDay(new Date());
  const fromDate = from ? startOfDay(new Date(from)) : startOfDay(subDays(toDate, 29));
  return { from: fromDate, to: toDate };
}

export const dashboardService = {
  async stats() {
    const today = { from: startOfDay(new Date()), to: endOfDay(new Date()) };
    const [todayStats, monthStats] = await Promise.all([
      dashboardRepository.snapshot(today.from, today.to),
      dashboardRepository.snapshot(startOfDay(subDays(new Date(), 29)), endOfDay(new Date())),
    ]);

    return {
      today: {
        orders: todayStats.orderCount,
        revenue: todayStats.revenue,
        newCustomers: todayStats.newCustomers,
      },
      last30Days: {
        orders: monthStats.orderCount,
        revenue: monthStats.revenue,
        newCustomers: monthStats.newCustomers,
      },
      pendingOrders: todayStats.pendingOrders,
      pendingReturns: todayStats.pendingReturns,
      totalCustomers: todayStats.totalCustomers,
    };
  },

  async sales(from?: string, to?: string) {
    const range = parseRange(from, to);
    const rows = await dashboardRepository.salesSeries(range.from, range.to);

    // BigInt cannot be JSON-serialised — convert counts to Number.
    return rows.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    }));
  },

  topProducts(from?: string, to?: string) {
    const range = parseRange(from, to);
    return dashboardRepository.topProducts(range.from, range.to);
  },

  async topCategories(from?: string, to?: string) {
    const range = parseRange(from, to);
    const rows = await dashboardRepository.topCategories(range.from, range.to);
    return rows.map((r) => ({ name: r.name, revenue: Number(r.revenue), units: Number(r.units) }));
  },

  lowStock() {
    return dashboardRepository.lowStockVariants();
  },

  recentOrders() {
    return dashboardRepository.recentOrders();
  },
};
