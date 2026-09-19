import { wishlistRepository } from '../repositories/wishlist.repository';
import { productRepository } from '../repositories/product.repository';
import { ApiError } from '../utils/ApiError';

export const wishlistService = {
  getWishlist(userId: string) {
    return wishlistRepository.findByUser(userId);
  },

  async addItem(userId: string, productId: string) {
    // Verify product exists and is active
    const product = await productRepository.findByIdBasic(productId);
    if (!product || product.deletedAt) throw ApiError.notFound('Product not found');

    return wishlistRepository.addItem(userId, productId);
  },

  removeItem(userId: string, productId: string) {
    return wishlistRepository.removeItem(userId, productId);
  },

  isInWishlist(userId: string, productId: string) {
    return wishlistRepository.isInWishlist(userId, productId);
  },

  checkBatch(userId: string, productIds: string[]) {
    return wishlistRepository.inWishlistBatch(userId, productIds);
  },
};
