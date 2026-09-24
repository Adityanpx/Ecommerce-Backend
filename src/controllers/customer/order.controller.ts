import { Request, Response } from 'express';
import { orderService } from '../../services/order.service';
import { paymentService } from '../../services/payment.service';
import { invoiceService } from '../../services/invoice.service';
import { addressService } from '../../services/address.service';
import { orderRepository } from '../../repositories/order.repository';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

/** Checkout routes sit behind requireCustomer, so req.user is always set where this is used. */
function owner(req: Request) {
  return { userId: req.user!.id };
}

export const orderController = {
  // ---------- Addresses ----------

  listAddresses: asyncHandler(async (req: Request, res: Response) => {
    const addresses = await addressService.list(req.user!.id);
    res.json(ApiResponse.ok({ addresses }));
  }),

  createAddress: asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.create(req.user!.id, req.body);
    res.status(201).json(ApiResponse.created({ address }, 'Address saved'));
  }),

  updateAddress: asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.update(req.user!.id, req.params.id, req.body);
    res.json(ApiResponse.ok({ address }, 'Address updated'));
  }),

  deleteAddress: asyncHandler(async (req: Request, res: Response) => {
    await addressService.remove(req.user!.id, req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Address deleted'));
  }),

  setDefaultAddress: asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.setDefault(req.user!.id, req.params.id);
    res.json(ApiResponse.ok({ address }, 'Default address updated'));
  }),

  // ---------- Checkout ----------

  summary: asyncHandler(async (req: Request, res: Response) => {
    const result = await orderService.summary(owner(req), req.body);
    res.json(ApiResponse.ok(result));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.create(owner(req), req.body);
    if (!order) throw ApiError.internal('Order creation failed');

    // COD orders are complete at this point. Razorpay orders need a payment session.
    if (order.paymentMethod === 'COD') {
      res.status(201).json(ApiResponse.created({ order, payment: null }, 'Order placed'));
      return;
    }

    const payment = await paymentService.initiate(order.id);
    res
      .status(201)
      .json(ApiResponse.created({ order, payment }, 'Order created — complete payment'));
  }),

  verifyPayment: asyncHandler(async (req: Request, res: Response) => {
    const order = await paymentService.verify(req.body);
    res.json(ApiResponse.ok({ order }, 'Payment verified'));
  }),

  // ---------- Orders ----------

  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const { items, total } = await orderService.list({ userId: req.user!.id }, skip, take);
    res.json(
      ApiResponse.ok({ orders: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const guestEmail = typeof req.query.email === 'string' ? req.query.email : undefined;
    const order = await orderService.getForCustomer(
      req.params.orderNumber,
      req.user?.id,
      guestEmail,
    );
    res.json(ApiResponse.ok({ order }));
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.cancel(req.params.id, req.body.reason, {
      userId: req.user!.id,
    });
    res.json(ApiResponse.ok({ order }, 'Order cancelled'));
  }),

  invoice: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderRepository.findById(req.params.id);
    if (!order) throw ApiError.notFound('Order not found');
    if (order.userId !== req.user!.id)
      throw ApiError.forbidden('This order does not belong to you');
    if (!order.invoiceNumber)
      throw ApiError.badRequest('An invoice is not available for this order yet');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${order.invoiceNumber}.pdf"`);

    await invoiceService.generate(order, res);
  }),
};
