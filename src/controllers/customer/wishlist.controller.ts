import { Request, Response } from 'express';
import { wishlistService } from '../../services/wishlist.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export const wishlistController = {
  getWishlist: asyncHandler(async (req: Request, res: Response) => {
    const wishlist = await wishlistService.getWishlist(req.user!.id);
    res.json(ApiResponse.ok({ wishlist }));
  }),

  addItem: asyncHandler(async (req: Request, res: Response) => {
    const item = await wishlistService.addItem(req.user!.id, req.body.productId);
    res.status(201).json(ApiResponse.created({ item }, 'Added to wishlist'));
  }),

  removeItem: asyncHandler(async (req: Request, res: Response) => {
    await wishlistService.removeItem(req.user!.id, req.params.productId);
    res.json(ApiResponse.ok({ removed: true }, 'Removed from wishlist'));
  }),

  check: asyncHandler(async (req: Request, res: Response) => {
    const inWishlist = await wishlistService.isInWishlist(req.user!.id, req.params.productId);
    res.json(ApiResponse.ok({ inWishlist }));
  }),

  batchCheck: asyncHandler(async (req: Request, res: Response) => {
    const wishlistedIds = await wishlistService.checkBatch(req.user!.id, req.body.productIds);
    res.json(ApiResponse.ok({ wishlistedIds: [...wishlistedIds] }));
  }),
};
