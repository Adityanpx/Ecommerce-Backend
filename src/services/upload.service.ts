import { createPresignedUpload, PresignedUpload } from '../integrations/r2/presignUpload';
import { UPLOAD } from '../config/constants';

export const uploadService = {
  async getSignature(
    folder: string,
    contentType: string,
  ): Promise<
    PresignedUpload & {
      maxFileSizeMb: number;
      allowedTypes: readonly string[];
    }
  > {
    const presigned = await createPresignedUpload(folder, contentType);
    return {
      ...presigned,
      maxFileSizeMb: UPLOAD.MAX_FILE_SIZE_MB,
      allowedTypes: UPLOAD.ALLOWED_IMAGE_TYPES,
    };
  },
};
