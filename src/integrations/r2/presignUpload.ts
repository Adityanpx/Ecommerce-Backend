import crypto from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '../../config/r2';
import { config } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { UPLOAD } from '../../config/constants';

export type UploadVisibility = 'public' | 'private';

export interface PresignedUpload {
  /** One-time-use PUT URL. The client uploads the raw file bytes here directly. */
  uploadUrl: string;
  /** Object key to store in the DB (existing `publicId` columns). Also needed to build the read URL / to delete later. */
  key: string;
  /** Final GET URL — only meaningful for public-bucket uploads. Null for private, since those are served through the backend. */
  publicUrl: string | null;
  /** Seconds until uploadUrl expires. */
  expiresIn: number;
}

const UPLOAD_URL_TTL_SECONDS = 300; // 5 minutes — plenty for a client to start an upload

/**
 * `returns` is customer-submitted and therefore goes to the private bucket;
 * everything else (products, banners, categories, avatars) is public-facing
 * catalog content.
 */
function bucketFor(folder: string): { bucket: string; visibility: UploadVisibility } {
  const privateFolders = new Set(['returns']);
  if (privateFolders.has(folder)) {
    return { bucket: config.r2.privateBucket, visibility: 'private' };
  }
  return { bucket: config.r2.publicBucket, visibility: 'public' };
}

/**
 * Mirrors createUploadSignature's shape/contract as closely as an S3-style
 * presign allows: caller passes a whitelisted subfolder, gets back what it
 * needs to complete a direct-to-storage upload from the browser.
 */
export async function createPresignedUpload(
  subFolder: string,
  contentType: string,
): Promise<PresignedUpload> {
  if (!r2Client) {
    throw ApiError.internal('R2 storage is not configured');
  }

  if (
    !UPLOAD.ALLOWED_IMAGE_TYPES.includes(contentType as (typeof UPLOAD.ALLOWED_IMAGE_TYPES)[number])
  ) {
    throw ApiError.badRequest(`Unsupported content type: ${contentType}`);
  }

  const { bucket, visibility } = bucketFor(subFolder);

  const extension = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
  const key = `${subFolder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    // Without this, the presigner only signs `host` — Content-Type rides
    // along unenforced, so a client could request a signature for
    // image/png and then PUT arbitrary bytes as e.g. text/html, which the
    // public bucket would then serve back with that MIME type.
    signableHeaders: new Set(['content-type']),
  });

  const publicUrl =
    visibility === 'public' && config.r2.publicBaseUrl
      ? `${config.r2.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : null;

  return { uploadUrl, key, publicUrl, expiresIn: UPLOAD_URL_TTL_SECONDS };
}
