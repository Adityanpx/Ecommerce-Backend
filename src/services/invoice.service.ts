import PDFDocument from 'pdfkit';
import { Writable } from 'stream';
import { OrderWithDetails } from '../repositories/order.repository';
import { settingsService } from './settings.service';
import { AddressSnapshot } from '../types/common.types';
import { add } from '../utils/money';

function money(value: number): string {
  return `Rs. ${value.toFixed(2)}`;
}

export const invoiceService = {
  /**
   * Indian GST splits into CGST+SGST when the seller and buyer are in the
   * same state, and IGST when they differ. The total tax is identical either
   * way — only the presentation changes.
   */
  splitTax(totalTax: number, sellerState: string, buyerState: string) {
    const sameState = sellerState.trim().toLowerCase() === buyerState.trim().toLowerCase();
    return sameState
      ? { cgst: totalTax / 2, sgst: totalTax / 2, igst: 0, sameState }
      : { cgst: 0, sgst: 0, igst: totalTax, sameState };
  },

  async generate(order: OrderWithDetails, target: Writable): Promise<void> {
    const settings = await settingsService.getAll();
    const address = order.shippingAddress as unknown as AddressSnapshot;
    const tax = this.splitTax(Number(order.taxAmount), settings.sellerState, address.state);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(target);

    // ---- Header ----
    doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
    doc.moveDown(1.2);

    doc.fontSize(11).font('Helvetica-Bold').text(settings.sellerName);
    doc.font('Helvetica').fontSize(9).text(settings.sellerAddress);
    if (settings.invoiceGstin) doc.text(`GSTIN: ${settings.invoiceGstin}`);
    doc.moveDown(1);

    // ---- Invoice meta ----
    const metaTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text('Invoice No:', 50, metaTop);
    doc.font('Helvetica').text(order.invoiceNumber ?? order.orderNumber, 130, metaTop);

    doc.font('Helvetica-Bold').text('Order No:', 50, metaTop + 14);
    doc.font('Helvetica').text(order.orderNumber, 130, metaTop + 14);

    doc.font('Helvetica-Bold').text('Date:', 50, metaTop + 28);
    doc
      .font('Helvetica')
      .text((order.placedAt ?? order.createdAt).toLocaleDateString('en-IN'), 130, metaTop + 28);

    doc.font('Helvetica-Bold').text('Payment:', 320, metaTop);
    doc.font('Helvetica').text(order.paymentMethod, 400, metaTop);

    doc.font('Helvetica-Bold').text('Status:', 320, metaTop + 14);
    doc.font('Helvetica').text(order.paymentStatus, 400, metaTop + 14);

    doc.y = metaTop + 50;
    doc.moveDown(0.5);

    // ---- Bill to ----
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To');
    doc.font('Helvetica').fontSize(9);
    doc.text(address.fullName);
    doc.text(address.line1);
    if (address.line2) doc.text(address.line2);
    doc.text(`${address.city}, ${address.state} - ${address.pincode}`);
    doc.text(`Phone: ${address.phone}`);
    doc.moveDown(1);

    // ---- Items table ----
    const tableTop = doc.y;
    const cols = { item: 50, hsn: 250, qty: 320, rate: 370, amount: 460 };

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Item', cols.item, tableTop);
    doc.text('HSN', cols.hsn, tableTop);
    doc.text('Qty', cols.qty, tableTop);
    doc.text('Rate', cols.rate, tableTop);
    doc.text('Amount', cols.amount, tableTop, { width: 85, align: 'right' });

    doc
      .moveTo(50, tableTop + 14)
      .lineTo(545, tableTop + 14)
      .stroke();

    let y = tableTop + 22;
    doc.font('Helvetica').fontSize(8);

    for (const item of order.items) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.text(`${item.productName}`, cols.item, y, { width: 190 });
      doc
        .fontSize(7)
        .fillColor('#666')
        .text(item.variantLabel, cols.item, y + 10, { width: 190 });
      doc.fontSize(8).fillColor('#000');

      doc.text(item.hsnCode ?? '-', cols.hsn, y);
      doc.text(String(item.quantity), cols.qty, y);
      doc.text(money(Number(item.unitPrice)), cols.rate, y);
      doc.text(money(Number(item.lineTotal)), cols.amount, y, { width: 85, align: 'right' });

      y += 26;
    }

    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 10;

    // ---- Totals ----
    const labelX = 350;
    const valueX = 460;

    const row = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      doc.text(label, labelX, y);
      doc.text(value, valueX, y, { width: 85, align: 'right' });
      y += 15;
    };

    row('Subtotal', money(Number(order.subtotal)));

    if (Number(order.discountAmount) > 0) {
      row(
        `Discount${order.couponCode ? ` (${order.couponCode})` : ''}`,
        `-${money(Number(order.discountAmount))}`,
      );
    }

    row(
      'Shipping',
      Number(order.shippingCharge) === 0 ? 'Free' : money(Number(order.shippingCharge)),
    );

    y += 4;
    doc.moveTo(labelX, y).lineTo(545, y).stroke();
    y += 8;

    row('Grand Total', money(Number(order.totalAmount)), true);

    y += 12;

    // ---- Tax breakdown ----
    doc.fontSize(8).font('Helvetica-Bold').text('Tax Breakdown (inclusive)', 50, y);
    y += 14;
    doc.font('Helvetica').fontSize(8);

    const taxableValue = add(Number(order.subtotal), -Number(order.taxAmount));
    doc.text(`Taxable value: ${money(taxableValue)}`, 50, y);
    y += 12;

    if (tax.sameState) {
      doc.text(`CGST: ${money(tax.cgst)}`, 50, y);
      doc.text(`SGST: ${money(tax.sgst)}`, 180, y);
    } else {
      doc.text(`IGST: ${money(tax.igst)}`, 50, y);
    }
    y += 12;
    doc.text(`Total tax: ${money(Number(order.taxAmount))}`, 50, y);

    y += 24;
    doc
      .fontSize(7)
      .fillColor('#666')
      .text(
        'All prices are inclusive of GST. This is a computer-generated invoice and does not require a signature.',
        50,
        y,
        { width: 495, align: 'center' },
      );

    doc.end();
  },
};
