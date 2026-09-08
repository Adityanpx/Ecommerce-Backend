import { orderService } from '../services/order.service';
import { logger } from '../utils/logger';

export async function cancelStalePayments(): Promise<void> {
  try {
    const count = await orderService.expireStalePayments();
    if (count > 0) {
      logger.info(`Cancelled ${count} stale pending-payment order(s) and restored stock`);
    }
  } catch (error) {
    logger.error('cancelStalePayments job failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
