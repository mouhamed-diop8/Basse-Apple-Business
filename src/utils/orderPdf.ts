import { getPaymentMethod, getShippingMethod, STORE } from '@/data/constants';
import { Order } from '@/data/types';
import { formatDateTime, formatPrice } from '@/utils/format';
import {
  pdfSafe,
  SimplePdf,
  wrapText,
  type PdfColor,
} from '@/utils/simplePdf';

const MARGIN = 48;
const INK: PdfColor = [0.04, 0.04, 0.04];
const MUTED: PdfColor = [0.54, 0.54, 0.56];
const LINE: PdfColor = [0.91, 0.91, 0.925];
const WHITE: PdfColor = [1, 1, 1];

export { pdfSafe };

export const ticketPdfFilename = (reference: string): string =>
  `Confirmation-${pdfSafe(reference) || 'commande'}.pdf`;

const paymentNote = (order: Order): string => {
  if (order.payment_status !== 'pending') return '';
  return order.payment_method === 'cash_on_delivery'
    ? ' - à régler à la réception'
    : ' - en attente de confirmation';
};

/**
 * Génère le bon de commande en PDF (A4), prêt à télécharger.
 */
export const buildOrderTicketPdf = async (order: Order): Promise<Uint8Array> => {
  const shipping = getShippingMethod(order.shipping_method);
  const payment = getPaymentMethod(order.payment_method);
  const address = order.shipping_address;

  const pdf = new SimplePdf();
  pdf.setInfo(`Confirmation ${order.reference} - ${STORE.name}`, STORE.name);

  let y = pdf.height - MARGIN;
  const right = pdf.width - MARGIN;
  const contentWidth = right - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed >= 56) return;
    pdf.addPage();
    y = pdf.height - MARGIN;
  };

  const rule = (gap = 16) => {
    ensure(gap + 8);
    y -= gap;
    pdf.line(MARGIN, y, right, y, LINE, 0.6, [3, 3]);
    y -= 16;
  };

  pdf.fillRect(MARGIN, y - 28, 28, 28, INK);
  pdf.text(MARGIN + 8, y - 21, 16, 'F2', 'B', WHITE);
  pdf.text(MARGIN + 40, y - 12, 16, 'F2', STORE.name, INK);
  pdf.text(MARGIN + 40, y - 28, 9, 'F1', STORE.tagline, MUTED);
  pdf.textRight(right, y - 8, 8, 'F2', 'CONFIRMATION DE COMMANDE', MUTED);
  pdf.textRight(right, y - 24, 14, 'F2', order.reference, INK);
  pdf.textRight(right, y - 38, 9, 'F1', formatDateTime(order.created_at), MUTED);

  y -= 64;
  rule(0);

  const colGap = 24;
  const colWidth = (contentWidth - colGap) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colWidth + colGap;

  pdf.text(leftX, y, 8, 'F2', 'CLIENT', MUTED);
  pdf.text(rightX, y, 8, 'F2', 'LIVRAISON', MUTED);
  y -= 16;

  const clientLines = [order.customer_name, order.customer_email, order.customer_phone].flatMap(
    (line) => wrapText(line, 10, colWidth),
  );
  const deliveryLines = [
    `${address.first_name} ${address.last_name}`,
    address.address,
    `${address.city}${address.district ? ` · ${address.district}` : ''}`,
    address.country,
    `${shipping.label} - ${order.eta}`,
  ].flatMap((line) => wrapText(line, 10, colWidth));

  const blockHeight = Math.max(clientLines.length, deliveryLines.length, 1) * 13;
  ensure(blockHeight + 8);

  clientLines.forEach((line, index) => {
    pdf.text(leftX, y - index * 13, index === 0 ? 11 : 10, index === 0 ? 'F2' : 'F1', line, INK);
  });
  deliveryLines.forEach((line, index) => {
    pdf.text(rightX, y - index * 13, 10, index === 0 ? 'F2' : 'F1', line, INK);
  });

  y -= blockHeight + 20;

  const qtyX = MARGIN + contentWidth - 196;
  const priceRight = MARGIN + contentWidth - 38;
  ensure(28);
  pdf.text(MARGIN, y, 8, 'F2', 'ARTICLE', MUTED);
  pdf.text(qtyX, y, 8, 'F2', 'QTE', MUTED);
  pdf.textRight(priceRight, y, 8, 'F2', 'PRIX', MUTED);
  pdf.textRight(right, y, 8, 'F2', 'TOTAL', MUTED);
  y -= 6;
  pdf.line(MARGIN, y, right, y, LINE, 0.8);
  y -= 16;

  const nameWidth = qtyX - MARGIN - 12;
  for (const item of order.items) {
    const nameLines = wrapText(item.name, 10, nameWidth, true);
    const variantLines = item.variant_label ? wrapText(item.variant_label, 9, nameWidth) : [];
    const rowHeight = Math.max(18, nameLines.length * 12 + variantLines.length * 11 + 10);
    ensure(rowHeight);

    nameLines.forEach((line, index) => {
      pdf.text(MARGIN, y - index * 12, 10, 'F2', line, INK);
    });
    variantLines.forEach((line, index) => {
      pdf.text(MARGIN, y - nameLines.length * 12 - index * 11, 9, 'F1', line, MUTED);
    });

    pdf.text(qtyX, y, 10, 'F1', String(item.quantity), INK);
    pdf.textRight(priceRight, y, 10, 'F1', formatPrice(item.unit_price), INK);
    pdf.textRight(right, y, 10, 'F2', formatPrice(item.unit_price * item.quantity), INK);

    y -= rowHeight;
    pdf.line(MARGIN, y + 8, right, y + 8, LINE, 0.4);
  }

  y -= 8;
  const totalsLeft = right - 220;
  const rows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: 'Sous-total', value: formatPrice(order.subtotal) },
    {
      label: 'Livraison',
      value: order.shipping_cost === 0 ? 'Offerte' : formatPrice(order.shipping_cost),
    },
  ];
  if (order.discount > 0) {
    rows.push({
      label: `Réduction${order.promo_code ? ` (${order.promo_code})` : ''}`,
      value: `- ${formatPrice(order.discount)}`,
    });
  }
  rows.push({ label: 'Total', value: formatPrice(order.total), strong: true });

  ensure(rows.length * 16 + 36);
  for (const row of rows) {
    const size = row.strong ? 13 : 10;
    const font = row.strong ? 'F2' : 'F1';
    if (row.strong) {
      y -= 6;
      pdf.line(totalsLeft, y + 14, right, y + 14, LINE, 0.8);
    }
    pdf.text(totalsLeft, y, size, font, row.label, INK);
    pdf.textRight(right, y, size, font, row.value, INK);
    y -= row.strong ? 20 : 16;
  }

  pdf.text(totalsLeft, y, 9, 'F1', `${payment.label}${paymentNote(order)}`, MUTED);
  y -= 8;
  rule(12);

  pdf.text(MARGIN, y, 8, 'F2', 'TICKETS ARTICLES', MUTED);
  y -= 14;

  const ticketGap = 10;
  const ticketWidth = (contentWidth - ticketGap) / 2;
  const ticketHeight = 62;

  order.items.forEach((item, index) => {
    const column = index % 2;
    if (column === 0) ensure(ticketHeight + 8);
    const x = MARGIN + column * (ticketWidth + ticketGap);
    const top = y;

    pdf.strokeRect(x, top - ticketHeight, ticketWidth, ticketHeight, LINE, 0.8, [3, 2]);
    pdf.text(x + 10, top - 16, 7, 'F2', 'TICKET', MUTED);
    pdf.text(x + 10, top - 30, 10, 'F2', wrapText(item.name, 10, ticketWidth - 20, true)[0] ?? '', INK);
    pdf.text(
      x + 10,
      top - 44,
      8,
      'F1',
      `${item.variant_label ? `${item.variant_label} · ` : ''}${item.quantity} x ${formatPrice(item.unit_price)}`,
      MUTED,
    );
    pdf.text(x + 10, top - 56, 9, 'F2', order.reference, INK);

    if (column === 1 || index === order.items.length - 1) {
      y -= ticketHeight + 10;
    }
  });

  ensure(40);
  y -= 8;
  wrapText(`${STORE.address} · ${STORE.phone} · ${STORE.email}`, 8, contentWidth).forEach(
    (line, index) => {
      pdf.textCenter(MARGIN + contentWidth / 2, y - index * 11, 8, 'F1', line, MUTED);
    },
  );
  pdf.textCenter(
    MARGIN + contentWidth / 2,
    y - 24,
    8,
    'F1',
    'Conservez ce PDF : il fait foi pour le suivi et le SAV.',
    MUTED,
  );

  return pdf.save();
};
