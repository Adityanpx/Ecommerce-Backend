import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '../../config/r2';
import { config } from '../../config/env';
import { ApiError } from '../../utils/ApiError';

const READ_URL_TTL_SECONDS = 300; // short-lived — regenerate per view, never store this URL

/**
 * The private bucket has no public access at all, so the only way to view
 * an object in it (a return photo, later an invoice PDF) is a short-lived
 * presigned GET issued after the backend checks the requester is allowed
 * to see it. Never persist the returned URL — it expires and a fresh one
 * should be generated on every request.
 */
export async function createPresignedRead(key: string): Promise<string> {
  if (!r2Client) {
    throw ApiError.internal('R2 storage is not configured');
  }

  const command = new GetObjectCommand({ Bucket: config.r2.privateBucket, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn: READ_URL_TTL_SECONDS });
}
