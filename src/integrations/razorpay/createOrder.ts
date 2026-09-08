import { getRazorpay } from '../../config/razorpay';

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
}

/**
 * Razorpay works in the smallest currency unit — paise, not rupees.
 * Rs.1,299.50 must be sent as 129950. Getting this wrong charges the
 * customer 100x too much or 100x too little.
 */
export async function createRazorpayOrder(
  amountInRupees: number,
  receipt: string,
  notes: Record<string, string> = {},
): Promise<RazorpayOrderResult> {
  const razorpay = getRazorpay();

  const order = await razorpay.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt,
    notes,
  });

  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
  };
}
