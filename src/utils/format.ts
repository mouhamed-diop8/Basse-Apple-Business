import { CURRENCY } from '@/data/constants';

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatPrice = (value: number): string =>
  `${priceFormatter.format(Math.max(0, value))} ${CURRENCY}`;

/** Prix sans décimales inutiles, pour les gros chiffres du dashboard. */
export const formatMoneyCompact = (value: number): string =>
  `${compactFormatter.format(value)} ${CURRENCY}`;

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('fr-FR').format(value);

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export const formatDateShort = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return formatDateShort(iso);
};

export const discountPercent = (price: number, salePrice: number | null): number => {
  if (!salePrice || salePrice >= price || price <= 0) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

/** Prix réellement payé pour un produit (promo si elle existe). */
export const effectivePrice = (price: number, salePrice: number | null): number =>
  salePrice && salePrice < price ? salePrice : price;

export const initials = (firstName: string, lastName: string): string =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

export const pluralize = (count: number, singular: string, plural?: string): string =>
  `${formatNumber(count)} ${count > 1 ? (plural ?? `${singular}s`) : singular}`;
