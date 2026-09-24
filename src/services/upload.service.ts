import { createPresignedUpload, PresignedUpload } from '../integrations/r2/presignUpload';
import { UPLOAD } from '../config/constants';

const MB = 1024 * 1024;

type SignatureResult = PresignedUpload & {
  maxFileSizeMb: number;
  allowedTypes: readonly string[];
};

export const uploadService = {
  /** Admin uploads. `videos` has its own types and size limit; everything else is an image. */
  async getSignature(
    folder: string,
    contentType: string,
    contentLength?: number,
  ): Promise<SignatureResult> {
    if (folder === 'videos') {
      const presigned = await createPresignedUpload(folder, contentType, {
        allowedTypes: UPLOAD.ALLOWED_VIDEO_TYPES,
        contentLength,
        maxBytes: UPLOAD.MAX_VIDEO_SIZE_MB * MB,
      });
      return {
        ...presigned,
        maxFileSizeMb: UPLOAD.MAX_VIDEO_SIZE_MB,
        allowedTypes: UPLOAD.ALLOWED_VIDEO_TYPES,
      };
    }

    const presigned = await createPresignedUpload(folder, contentType, {
      contentLength,
      ...(contentLength !== undefined ? { maxBytes: UPLOAD.MAX_FILE_SIZE_MB * MB } : {}),
    });
    return {
      ...presigned,
      maxFileSizeMb: UPLOAD.MAX_FILE_SIZE_MB,
      allowedTypes: UPLOAD.ALLOWED_IMAGE_TYPES,
    };
  },

  /** Customer profile picture. Size is signed into the URL, so R2 enforces the 2 MB cap. */
  async getAvatarSignature(contentType: string, contentLength: number): Promise<SignatureResult> {
    const presigned = await createPresignedUpload('avatars', contentType, {
      contentLength,
      maxBytes: UPLOAD.MAX_AVATAR_SIZE_MB * MB,
    });
    return {
      ...presigned,
      maxFileSizeMb: UPLOAD.MAX_AVATAR_SIZE_MB,
      allowedTypes: UPLOAD.ALLOWED_IMAGE_TYPES,
    };
  },
};
