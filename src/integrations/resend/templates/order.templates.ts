import { baseLayout } from './base';

interface OrderLine {
  productName: string;
  variantLabel: string;
  quantity: number;
  lineTotal: number;
}

function money(value: number): string {
  return `Rs. ${value.toFixed(2)}`;
}

function itemsTable(items: OrderLine[]): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          ${item.productName}<br />
          <span style="color:#888;font-size:13px;">${item.variantLabel} &times; ${item.quantity}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
          ${money(item.lineTotal)}
        </td>
      </tr>`,
    )
    .join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}

export function orderConfirmedEmail(data: {
  firstName: string;
  orderNumber: string;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}): { subject: string; html: string } {
  return {
    subject: `Order ${data.orderNumber} confirmed`,
    html: baseLayout(
      'Order confirmed',
      `<h2 style="margin:0 0 8px;">Thank you, ${data.firstName}</h2>
       <p>Your order <strong>${data.orderNumber}</strong> has been confirmed and is being prepared.</p>
       ${itemsTable(data.items)}
       <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
         <tr><td>Subtotal</td><td align="right">${money(data.subtotal)}</td></tr>
         ${data.discount > 0 ? `<tr><td>Discount</td><td align="right">-${money(data.discount)}</td></tr>` : ''}
         <tr><td>Shipping</td><td align="right">${data.shipping === 0 ? 'Free' : money(data.shipping)}</td></tr>
         <tr><td style="padding-top:8px;font-weight:bold;border-top:1px solid #ddd;">Total</td>
             <td align="right" style="padding-top:8px;font-weight:bold;border-top:1px solid #ddd;">${money(data.total)}</td></tr>
       </table>
       <p style="color:#888;font-size:13px;margin-top:20px;">Prices are inclusive of GST.</p>`,
    ),
  };
}

export function orderShippedEmail(data: {
  firstName: string;
  orderNumber: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl?: string | null;
}): { subject: string; html: string } {
  const tracking = data.trackingUrl
    ? `<p><a href="${data.trackingUrl}" style="color:#111;">Track your shipment</a></p>`
    : '';

  return {
    subject: `Order ${data.orderNumber} has shipped`,
    html: baseLayout(
      'Order shipped',
      `<h2 style="margin:0 0 8px;">Your order is on its way</h2>
       <p>Hi ${data.firstName}, order <strong>${data.orderNumber}</strong> has been dispatched.</p>
       <p><strong>Courier:</strong> ${data.courierName}<br />
          <strong>Tracking number:</strong> ${data.trackingNumber}</p>
       ${tracking}`,
    ),
  };
}

export function orderDeliveredEmail(data: {
  firstName: string;
  orderNumber: string;
  returnWindowDays: number;
}): { subject: string; html: string } {
  return {
    subject: `Order ${data.orderNumber} delivered`,
    html: baseLayout(
      'Order delivered',
      `<h2 style="margin:0 0 8px;">Delivered</h2>
       <p>Hi ${data.firstName}, order <strong>${data.orderNumber}</strong> has been delivered.</p>
       <p>If anything is not right, you can raise a return from your account within ${data.returnWindowDays} days.</p>`,
    ),
  };
}

export function orderCancelledEmail(data: {
  firstName: string;
  orderNumber: string;
  reason?: string | null;
  refundAmount?: number;
}): { subject: string; html: string } {
  return {
    subject: `Order ${data.orderNumber} cancelled`,
    html: baseLayout(
      'Order cancelled',
      `<h2 style="margin:0 0 8px;">Order cancelled</h2>
       <p>Hi ${data.firstName}, order <strong>${data.orderNumber}</strong> has been cancelled.</p>
       ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
       ${
         data.refundAmount
           ? `<p>A refund of ${money(data.refundAmount)} has been initiated and will reach your account in 5-7 working days.</p>`
           : ''
       }`,
    ),
  };
}

export function refundProcessedEmail(data: {
  firstName: string;
  orderNumber: string;
  amount: number;
}): { subject: string; html: string } {
  return {
    subject: `Refund processed for ${data.orderNumber}`,
    html: baseLayout(
      'Refund processed',
      `<h2 style="margin:0 0 8px;">Refund processed</h2>
       <p>Hi ${data.firstName}, a refund of <strong>${money(data.amount)}</strong> for order
       <strong>${data.orderNumber}</strong> has been processed.</p>
       <p>It should reach your original payment method within 5-7 working days.</p>`,
    ),
  };
}

export function adminAlertEmail(
  title: string,
  bodyHtml: string,
): { subject: string; html: string } {
  return { subject: `[Admin] ${title}`, html: baseLayout(title, `<h2>${title}</h2>${bodyHtml}`) };
}
