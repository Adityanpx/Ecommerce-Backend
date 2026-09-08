import { cloudinary } from '../../config/cloudinary';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Deletion is best-effort. A failure here must never block deleting the
 * database row — an orphaned Cloudinary asset is a minor cost, a stuck
 * delete operation is a broken admin panel.
 */
export async function deleteAsset(publicId: string): Promise<void> {
  if (!config.cloudinary.isConfigured) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.warn('Cloudinary delete failed', {
      publicId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function deleteAssets(publicIds: string[]): Promise<void> {
  await Promise.all(publicIds.map((id) => deleteAsset(id)));
}
