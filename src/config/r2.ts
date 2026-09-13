import { S3Client } from '@aws-sdk/client-s3';
import { config } from './env';

/**
 * R2 is S3-compatible, so the regular AWS SDK v3 S3 client works unchanged —
 * only the endpoint and credentials differ. `region` is required by the SDK
 * but ignored by R2 itself, so 'auto' is the documented value.
 */
export const r2Client = config.r2.isConfigured
  ? new S3Client({
      region: 'auto',
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId as string,
        secretAccessKey: config.r2.secretAccessKey as string,
      },
    })
  : null;
