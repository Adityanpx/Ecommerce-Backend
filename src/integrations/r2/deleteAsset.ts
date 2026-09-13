import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '../../config/r2';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Deletion is best-effort, same contract as the Cloudinary version this
 * replaces. A failure here must never block deleting the database row — an
 * orphaned R2 object is a minor cost, a stuck delete operation is a broken
 * admin panel.
 *
 * `key` is the full object key as stored in the DB (existing `publicId`
 * columns), e.g. "products/1234-uuid.jpg". The folder prefix tells us which
 * bucket it lives in, so the function signature stays a single argument —
 * no schema change required on the existing `publicId` columns.
 */
export async function deleteAsset(key: string): Promise<void> {
  if (!r2Client) return;

  const isPrivateFolder = key.startsWith('returns/');
  const bucket = isPrivateFolder ? config.r2.privateBucket : config.r2.publicBucket;

  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    logger.warn('R2 delete failed', {
      key,
      bucket,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function deleteAssets(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteAsset(key)));
}
