import { dashboardRepository } from '../repositories/dashboard.repository';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

export async function lowStockAlert(): Promise<void> {
  try {
    const variants = await dashboardRepository.lowStockVariants();
    if (variants.length === 0) return;

    const rows = variants
      .map(
        (v) =>
          `<tr><td style="padding:4px 12px 4px 0;">${v.productName}</td>
           <td style="padding:4px 12px 4px 0;">${[v.size, v.color].filter(Boolean).join(' / ') || 'One size'}</td>
           <td style="padding:4px 0;"><strong>${v.stock}</strong> left</td></tr>`,
      )
      .join('');

    await notificationService.adminAlert(
      `${variants.length} product variant(s) low on stock`,
      `<table>${rows}</table>`,
    );

    logger.info(`Low stock alert sent for ${variants.length} variant(s)`);
  } catch (error) {
    logger.error('lowStockAlert job failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
