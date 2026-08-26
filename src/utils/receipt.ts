import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getPaymentMethod, getShippingMethod, STORE } from '@/data/constants';
import { Order } from '@/data/types';
import { formatDateTime, formatPrice } from '@/utils/format';
import { buildOrderTicketPdf, ticketPdfFilename } from '@/utils/orderPdf';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const paymentNote = (order: Order): string => {
  if (order.payment_status !== 'pending') return '';
  return order.payment_method === 'cash_on_delivery'
    ? ' — à régler à la réception'
    : ' — en attente de confirmation';
};

/** HTML du billet de commande, prêt à imprimer ou enregistrer en PDF. */
export const buildOrderTicketHtml = (order: Order): string => {
  const shipping = getShippingMethod(order.shipping_method);
  const payment = getPaymentMethod(order.payment_method);
  const address = order.shipping_address;

  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            ${
              item.variant_label
                ? `<div class="muted">${escapeHtml(item.variant_label)}</div>`
                : ''
            }
          </td>
          <td class="center">${item.quantity}</td>
          <td class="right">${escapeHtml(formatPrice(item.unit_price))}</td>
          <td class="right">${escapeHtml(formatPrice(item.unit_price * item.quantity))}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Billet ${escapeHtml(order.reference)} — ${escapeHtml(STORE.name)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #0A0A0A;
      background: #F7F7F9;
    }
    .sheet {
      max-width: 720px;
      margin: 24px auto;
      background: #fff;
      padding: 36px 40px;
      border-radius: 16px;
      border: 1px solid #E8E8EC;
    }
    .brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .logo {
      width: 40px; height: 40px; border-radius: 10px; background: #0A0A0A;
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 18px;
    }
    h1 { margin: 8px 0 0; font-size: 22px; }
    .eyebrow { color: #8A8A8E; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
    .ref {
      text-align: right;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .muted { color: #8A8A8E; font-size: 13px; }
    hr { border: 0; border-top: 1px dashed #D8D8DE; margin: 24px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; color: #8A8A8E; text-transform: uppercase; padding: 8px 0; border-bottom: 1px solid #E8E8EC; }
    td { padding: 12px 0; border-bottom: 1px solid #F2F2F5; font-size: 14px; vertical-align: top; }
    .center { text-align: center; }
    .right { text-align: right; white-space: nowrap; }
    .totals { width: 280px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .totals .grand { font-size: 18px; font-weight: 700; border-top: 1px solid #E8E8EC; margin-top: 8px; padding-top: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .footer { margin-top: 32px; font-size: 12px; color: #8A8A8E; text-align: center; }
    .tickets { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
    .ticket {
      border: 1px dashed #D8D8DE;
      border-radius: 12px;
      padding: 14px 16px;
      page-break-inside: avoid;
    }
    .ticket .ref { font-size: 14px; letter-spacing: 0.06em; margin-top: 8px; }
    @page { size: A4; margin: 12mm; }
    @media print {
      body { background: #fff; }
      .sheet { margin: 0; border: 0; border-radius: 0; padding: 12px; box-shadow: none; }
      .ticket { break-inside: avoid; }
    }
    @media (max-width: 640px) {
      .grid, .tickets { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <article class="sheet">
    <header class="brand">
      <div>
        <div class="logo">B</div>
        <h1>${escapeHtml(STORE.name)}</h1>
        <div class="muted">${escapeHtml(STORE.tagline)}</div>
      </div>
      <div>
        <div class="eyebrow">Confirmation de commande</div>
        <div class="ref">${escapeHtml(order.reference)}</div>
        <div class="muted">${escapeHtml(formatDateTime(order.created_at))}</div>
      </div>
    </header>

    <hr />

    <div class="grid">
      <div>
        <div class="eyebrow">Client</div>
        <p>
          <strong>${escapeHtml(order.customer_name)}</strong><br />
          ${escapeHtml(order.customer_email)}<br />
          ${escapeHtml(order.customer_phone)}
        </p>
      </div>
      <div>
        <div class="eyebrow">Livraison</div>
        <p>
          ${escapeHtml(address.first_name)} ${escapeHtml(address.last_name)}<br />
          ${escapeHtml(address.address)}<br />
          ${escapeHtml(address.city)}${address.district ? ` · ${escapeHtml(address.district)}` : ''}<br />
          ${escapeHtml(address.country)}<br />
          <span class="muted">${escapeHtml(shipping.label)} — ${escapeHtml(order.eta)}</span>
        </p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Article</th>
          <th class="center">Qté</th>
          <th class="right">Prix</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Sous-total</span><span>${escapeHtml(formatPrice(order.subtotal))}</span></div>
      <div>
        <span>Livraison</span>
        <span>${order.shipping_cost === 0 ? 'Offerte' : escapeHtml(formatPrice(order.shipping_cost))}</span>
      </div>
      ${
        order.discount > 0
          ? `<div><span>Réduction${order.promo_code ? ` (${escapeHtml(order.promo_code)})` : ''}</span><span>− ${escapeHtml(formatPrice(order.discount))}</span></div>`
          : ''
      }
      <div class="grand"><span>Total</span><span>${escapeHtml(formatPrice(order.total))}</span></div>
      <div class="muted">${escapeHtml(payment.label)}${escapeHtml(paymentNote(order))}</div>
    </div>

    <hr />
    <div class="eyebrow">Tickets articles</div>
    <div class="tickets">
      ${order.items
        .map(
          (item) => `
        <div class="ticket">
          <div class="eyebrow">Ticket</div>
          <strong>${escapeHtml(item.name)}</strong>
          <div class="muted">
            ${item.variant_label ? `${escapeHtml(item.variant_label)} · ` : ''}
            ${item.quantity} × ${escapeHtml(formatPrice(item.unit_price))}
          </div>
          <div class="ref">${escapeHtml(order.reference)}</div>
          <div class="muted">${escapeHtml(STORE.name)}</div>
        </div>`,
        )
        .join('')}
    </div>

    <p class="footer">
      ${escapeHtml(STORE.address)} · ${escapeHtml(STORE.phone)} · ${escapeHtml(STORE.email)}<br />
      Conservez ce billet : il fait foi pour le suivi et le SAV.
    </p>
  </article>
</body>
</html>`;
};

const downloadPdfWeb = (bytes: Uint8Array, filename: string) => {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const printHtmlWeb = (html: string): boolean => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  };

  if (frame.contentWindow?.document.readyState === 'complete') run();
  else frame.onload = run;

  return true;
};

/**
 * Télécharge la confirmation au format PDF.
 */
export const downloadOrderTicket = async (order: Order): Promise<void> => {
  if (Platform.OS === 'web') {
    const bytes = await buildOrderTicketPdf(order);
    downloadPdfWeb(bytes, ticketPdfFilename(order.reference));
    return;
  }

  const html = buildOrderTicketHtml(order);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Confirmation ${order.reference}`,
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  await Print.printAsync({ html });
};

/** Ouvre l’aperçu d’impression (le navigateur permet d’enregistrer en PDF). */
export const printOrderTicket = async (order: Order): Promise<void> => {
  const html = buildOrderTicketHtml(order);

  if (Platform.OS === 'web') {
    if (!printHtmlWeb(html)) {
      throw new Error('print-failed');
    }
    return;
  }

  await Print.printAsync({ html });
};
