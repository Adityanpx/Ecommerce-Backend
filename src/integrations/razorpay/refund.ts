import { getRazorpay } from '../../config/razorpay';

export interface RefundResult {
  id: string;
  amount: number;
  status: string;
}

export async function createRefund(
  razorpayPaymentId: string,
  amountInRupees?: number,
): Promise<RefundResult> {
  const razorpay = getRazorpay();

  // Omitting amount refunds the full payment.
  const payload =
    amountInRupees !== undefined
      ? { amount: Math.round(amountInRupees * 100), speed: 'normal' as const }
      : { speed: 'normal' as const };

  const refund = await razorpay.payments.refund(razorpayPaymentId, payload);

  return {
    id: refund.id,
    amount: Number(refund.amount) / 100,
    status: refund.status as string,
  };
}
