import { Product, ProductBadge, ProductVariant, VariantKind } from '@/data/types';

const NEW_WINDOW_DAYS = 45;
const BESTSELLER_UNITS = 400;

export const isNewProduct = (product: Product): boolean =>
  Date.now() - new Date(product.created_at).getTime() < NEW_WINDOW_DAYS * 86_400_000;

export const isOnSale = (product: Product): boolean =>
  Boolean(product.sale_price && product.sale_price < product.price);

/** Badges affichés sur la carte produit, au maximum deux pour rester lisible. */
export const productBadges = (product: Product): ProductBadge[] => {
  const badges: ProductBadge[] = [];

  if (isOnSale(product)) badges.push('promo');
  if (isNewProduct(product)) badges.push('new');
  if (product.units_sold >= BESTSELLER_UNITS) badges.push('bestseller');

  return badges.slice(0, 2);
};

export const BADGE_LABELS: Record<ProductBadge, string> = {
  new: 'Nouveau',
  promo: 'Promo',
  bestseller: 'Meilleure vente',
};

export interface StockInfo {
  label: string;
  tone: 'success' | 'warning' | 'danger';
  available: boolean;
}

export const stockInfo = (product: Product): StockInfo => {
  if (product.stock <= 0) {
    return { label: 'Rupture de stock', tone: 'danger', available: false };
  }

  if (product.stock <= product.low_stock_threshold) {
    return {
      label: `Plus que ${product.stock} en stock`,
      tone: 'warning',
      available: true,
    };
  }

  return { label: 'En stock', tone: 'success', available: true };
};

export const VARIANT_KIND_ORDER: VariantKind[] = ['color', 'storage', 'ram', 'size', 'config'];

export interface VariantGroup {
  kind: VariantKind;
  name: string;
  options: ProductVariant[];
}

/** Regroupe les variantes par axe de choix, dans un ordre d'affichage stable. */
export const groupVariants = (product: Product): VariantGroup[] => {
  const groups = new Map<VariantKind, VariantGroup>();

  product.variants.forEach((variant) => {
    const existing = groups.get(variant.kind);
    if (existing) existing.options.push(variant);
    else groups.set(variant.kind, { kind: variant.kind, name: variant.name, options: [variant] });
  });

  return VARIANT_KIND_ORDER.filter((kind) => groups.has(kind)).map((kind) => groups.get(kind)!);
};

/**
 * Sélection par défaut : la première option disponible de chaque axe, ou la
 * première tout court si l'axe est entièrement en rupture.
 */
export const defaultVariantSelection = (product: Product): ProductVariant[] =>
  groupVariants(product).map(
    (group) => group.options.find((option) => option.stock > 0) ?? group.options[0],
  );

export const conditionLabel = (product: Product): string =>
  product.condition === 'refurbished' ? 'Reconditionné' : 'Neuf';
