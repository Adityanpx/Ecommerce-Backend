import { Request, Response } from 'express';
import { cartService, CartOwner } from '../../services/cart.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

function owner(req: Request): CartOwner {
  return { userId: req.user?.id, guestToken: req.guestToken };
}

function respond(
  res: Response,
  result: Awaited<ReturnType<typeof cartService.get>>,
  message = 'Success',
) {
  if (result.guestToken) res.setHeader('X-Guest-Token', result.guestToken);
  res.json(ApiResponse.ok(result, message));
}

export const cartController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    respond(res, await cartService.get(owner(req)));
  }),

  addItem: asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.addItem(owner(req), req.body.variantId, req.body.quantity);
    respond(res, result, 'Item added to cart');
  }),

  updateItem: asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.updateItemQuantity(
      owner(req),
      req.params.id,
      req.body.quantity,
    );
    respond(res, result, 'Cart updated');
  }),

  removeItem: asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.removeItem(owner(req), req.params.id);
    respond(res, result, 'Item removed');
  }),

  saveForLater: asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.toggleSaveForLater(owner(req), req.params.id, true);
    respond(res, result, 'Saved for later');
  }),

  moveToCart: asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.toggleSaveForLater(owner(req), req.params.id, false);
    respond(res, result, 'Moved to cart');
  }),

  applyCoupon: asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.applyCoupon(owner(req), req.body.code);
    respond(res, result, 'Coupon applied');
  }),

  removeCoupon: asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.removeCoupon(owner(req));
    respond(res, result, 'Coupon removed');
  }),

  clear: asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.clear(owner(req));
    respond(res, result, 'Cart cleared');
  }),

  merge: asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.merge(req.user!.id, req.body.guestToken);
    res.json(ApiResponse.ok(result, 'Cart merged'));
  }),
};
