import { cloudinary } from '../../config/cloudinary';
import { config } from '../../config/env';
import { ApiError } from '../../utils/ApiError';

export interface UploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export function createUploadSignature(subFolder: string): UploadSignature {
  if (!config.cloudinary.isConfigured) {
    throw ApiError.internal('Cloudinary is not configured');
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `${config.cloudinary.folder}/${subFolder}`;

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    config.cloudinary.apiSecret as string,
  );

  return {
    signature,
    timestamp,
    apiKey: config.cloudinary.apiKey as string,
    cloudName: config.cloudinary.cloudName as string,
    folder,
  };
}
