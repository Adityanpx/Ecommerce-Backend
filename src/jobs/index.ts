import cron from 'node-cron';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { cancelStalePayments } from './cancelStalePayments.job';
import { cleanupGuestCarts } from './cleanupGuestCarts.job';
import { lowStockAlert } from './lowStockAlert.job';

const tasks: cron.ScheduledTask[] = [];

export function startJobs(): void {
  // Every 5 minutes — releases stock from abandoned checkouts.
  tasks.push(cron.schedule('*/5 * * * *', () => void cancelStalePayments()));

  // Daily at 03:00 — housekeeping.
  tasks.push(cron.schedule('0 3 * * *', () => void cleanupGuestCarts()));

  // Daily at 09:00 — one digest instead of an alert per sale.
  tasks.push(cron.schedule('0 9 * * *', () => void lowStockAlert()));

  logger.info(`Started ${tasks.length} scheduled jobs`);

  if (config.isDevelopment) {
    logger.info('Jobs are running in development — stop the server to halt them');
  }
}

export function stopJobs(): void {
  tasks.forEach((task) => task.stop());
  tasks.length = 0;
}
