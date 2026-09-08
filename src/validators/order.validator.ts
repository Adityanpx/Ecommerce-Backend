import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

const phoneField = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');
const pincodeField = z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode');

export const addressBodySchema = z.object({
  label: z.string().max(50).default('Home'),
  fullName: z.string().min(1, 'Full name is required').max(150),
  phone: phoneField,
  line1: z.string().min(1, 'Address line 1 is required').max(255),
  line2: z.string().max(255).nullable().optional(),
  landmark: z.string().max(150).nullable().optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pincode: pincodeField,
  country: z.string().max(100).default('India'),
  isDefault: z.boolean().default(false),
});

export const createAddressSchema = z.object({ body: addressBodySchema });

export const updateAddressSchema = z.object({
  params: z.object({ id: uuid }),
  body: addressBodySchema.partial(),
});

/** Guests pass a full address inline; logged-in users pass an addressId. */
export const checkoutSummarySchema = z.object({
  body: z.object({
    addressId: uuid.optional(),
    address: addressBodySchema.omit({ isDefault: true, label: true }).optional(),
    paymentMethod: z.enum(['RAZORPAY', 'COD']).default('RAZORPAY'),
  }),
});

export const createOrderSchema = z.object({
  body: z.object({
    addressId: uuid.optional(),
    address: addressBodySchema.omit({ isDefault: true, label: true }).optional(),
    paymentMethod: z.enum(['RAZORPAY', 'COD']),
    guestEmail: z.string().email('Enter a valid email').optional(),
    guestPhone: phoneField.optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
});

export const cancelOrderSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    status: z.enum(['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED']),
    note: z.string().max(500).optional(),
  }),
});

export const updateShippingSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    courierName: z.string().min(1, 'Courier name is required').max(120),
    trackingNumber: z.string().min(1, 'Tracking number is required').max(120),
    trackingUrl: z.string().url('Enter a valid tracking URL').nullable().optional(),
  }),
});
