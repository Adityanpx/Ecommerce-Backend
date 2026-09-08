import { createUploadSignature, UploadSignature } from '../integrations/cloudinary/signUpload';
import { UPLOAD } from '../config/constants';

export const uploadService = {
  getSignature(folder: string): UploadSignature & {
    maxFileSizeMb: number;
    allowedTypes: readonly string[];
  } {
    return {
      ...createUploadSignature(folder),
      maxFileSizeMb: UPLOAD.MAX_FILE_SIZE_MB,
      allowedTypes: UPLOAD.ALLOWED_IMAGE_TYPES,
    };
  },
};
