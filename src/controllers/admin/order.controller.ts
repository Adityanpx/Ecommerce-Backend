import { Request, Response } from 'express';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { orderService } from '../../services/order.service';
import { invoiceService } from '../../services/invoice.service';
import { refundService } from '../../services/refund.service';
import { customerRepository } from '../../repositories/customer.repository';
import { orderRepository } from '../../repositories/order.repository';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

export const adminOrderController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const q = req.query as Record<string, string | undefined>;

    const { items, total } = await orderService.list(
      {
        status: q.status as OrderStatus | undefined,
        paymentStatus: q.paymentStatus as PaymentStatus | undefined,
        paymentMethod: q.paymentMethod as 'RAZORPAY' | 'COD' | undefined,
        search: q.search,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
      },
      skip,
      take,
    );

    res.json(
      ApiResponse.ok({ orders: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getForAdmin(req.params.id);
    res.json(ApiResponse.ok({ order }));
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.updateStatus(
      req.params.id,
      req.body.status,
      req.admin!.id,
      req.body.note,
    );
    res.json(ApiResponse.ok({ order }, `Order marked as ${req.body.status.toLowerCase()}`));
  }),

  updateShipping: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.setShipping(req.params.id, req.body);
    res.json(ApiResponse.ok({ order }, 'Shipping details saved'));
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.cancel(req.params.id, req.body.reason, {
      adminId: req.admin!.id,
    });
    res.json(ApiResponse.ok({ order }, 'Order cancelled'));
  }),

  refund: asyncHandler(async (req: Request, res: Response) => {
    const amount = req.body.amount !== undefined ? Number(req.body.amount) : undefined;
    const result = await refundService.refundOrder(req.params.id, amount);
    res.json(ApiResponse.ok(result, 'Refund initiated'));
  }),

  invoice: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderRepository.findById(req.params.id);
    if (!order) throw ApiError.notFound('Order not found');
    if (!order.invoiceNumber) throw ApiError.badRequest('This order has no invoice number yet');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${order.invoiceNumber}.pdf"`);

    await invoiceService.generate(order, res);
  }),

  // ---------- Customers ----------

  listCustomers: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const { items, total } = await customerRepository.findMany(skip, take, search);
    res.json(
      ApiResponse.ok({ customers: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  getCustomer: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerRepository.findDetail(req.params.id);
    if (!customer) throw ApiError.notFound('Customer not found');
    res.json(ApiResponse.ok({ customer }));
  }),

  setCustomerStatus: asyncHandler(async (req: Request, res: Response) => {
    const isActive = Boolean(req.body.isActive);
    const customer = await customerRepository.setActive(req.params.id, isActive);
    res.json(ApiResponse.ok({ customer }, isActive ? 'Customer unblocked' : 'Customer blocked'));
  }),
};
