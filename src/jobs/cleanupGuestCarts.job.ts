import { cartRepository } from '../repositories/cart.repository';
import { logger } from '../utils/logger';

export async function cleanupGuestCarts(): Promise<void> {
  try {
    const result = await cartRepository.deleteExpiredGuestCarts();
    if (result.count > 0) {
      logger.info(`Deleted ${result.count} expired guest cart(s)`);
    }
  } catch (error) {
    logger.error('cleanupGuestCarts job failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
