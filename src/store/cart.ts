import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { FREE_SHIPPING_THRESHOLD, getShippingMethod } from '@/data/constants';
import {
  AppliedPromo,
  CartLine,
  Product,
  ProductVariant,
  ShippingMethodId,
} from '@/data/types';
import { effectivePrice } from '@/utils/format';

const round = (value: number) => Math.round(value * 100) / 100;

/** Construit une clé de ligne stable : même produit + mêmes variantes = même ligne. */
export const cartLineKey = (productId: string, variantIds: string[]): string =>
  [productId, ...[...variantIds].sort()].join('|');

/** Prix unitaire d'un produit avec les suppléments de variantes sélectionnées. */
export const resolveUnitPrice = (product: Product, variants: ProductVariant[]): number =>
  round(
    effectivePrice(product.price, product.sale_price) +
      variants.reduce((sum, variant) => sum + variant.price_delta, 0),
  );

/**
 * Stock disponible pour la combinaison choisie : la variante la plus contrainte
 * l'emporte, sans jamais dépasser le stock global du produit.
 */
export const resolveMaxStock = (product: Product, variants: ProductVariant[]): number => {
  const constraints = variants.filter((variant) => variant.stock > 0).map((v) => v.stock);
  return constraints.length ? Math.min(product.stock, ...constraints) : product.stock;
};

export const variantLabel = (variants: ProductVariant[]): string | null =>
  variants.length ? variants.map((variant) => variant.value).join(' · ') : null;

interface CartState {
  lines: CartLine[];
  /** Le code est conservé, le montant est recalculé à chaque changement de panier. */
  promo: { code: string; type: AppliedPromo['type']; value: number } | null;
  shippingMethod: ShippingMethodId;

  addProduct(product: Product, variants: ProductVariant[], quantity?: number): CartLine;
  setQuantity(key: string, quantity: number): void;
  increment(key: string): void;
  decrement(key: string): void;
  removeLine(key: string): void;
  clear(): void;
  setPromo(promo: AppliedPromo | null): void;
  setShippingMethod(method: ShippingMethodId): void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      promo: null,
      shippingMethod: 'standard',

      addProduct: (product, variants, quantity = 1) => {
        const key = cartLineKey(product.id, variants.map((v) => v.id));
        const maxStock = resolveMaxStock(product, variants);
        const existing = get().lines.find((line) => line.key === key);

        const line: CartLine = {
          key,
          product_id: product.id,
          name: product.name,
          image: product.images[0] ?? '',
          brand: product.brand,
          unit_price: resolveUnitPrice(product, variants),
          quantity: Math.min(maxStock, (existing?.quantity ?? 0) + quantity),
          max_stock: maxStock,
          variant_label: variantLabel(variants),
          variant_ids: variants.map((v) => v.id),
        };

        set({
          lines: existing
            ? get().lines.map((item) => (item.key === key ? line : item))
            : [...get().lines, line],
        });

        return line;
      },

      setQuantity: (key, quantity) =>
        set({
          lines: get()
            .lines.map((line) =>
              line.key === key
                ? { ...line, quantity: Math.max(0, Math.min(line.max_stock, quantity)) }
                : line,
            )
            .filter((line) => line.quantity > 0),
        }),

      increment: (key) => {
        const line = get().lines.find((item) => item.key === key);
        if (line) get().setQuantity(key, line.quantity + 1);
      },

      decrement: (key) => {
        const line = get().lines.find((item) => item.key === key);
        if (line) get().setQuantity(key, line.quantity - 1);
      },

      removeLine: (key) => set({ lines: get().lines.filter((line) => line.key !== key) }),

      clear: () => set({ lines: [], promo: null }),

      setPromo: (promo) =>
        set({ promo: promo ? { code: promo.code, type: promo.type, value: promo.value } : null }),

      setShippingMethod: (shippingMethod) => set({ shippingMethod }),
    }),
    {
      name: 'techstore.cart.v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/* ------------------------------- sélecteurs ------------------------------- */

export const cartItemCount = (lines: CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.quantity, 0);

export const cartSubtotal = (lines: CartLine[]): number =>
  round(lines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0));

export const cartDiscount = (
  subtotal: number,
  promo: CartState['promo'],
): number => {
  if (!promo) return 0;
  const raw = promo.type === 'percentage' ? (subtotal * promo.value) / 100 : promo.value;
  return round(Math.min(raw, subtotal));
};

export const cartShippingCost = (subtotal: number, method: ShippingMethodId): number => {
  if (method === 'pickup') return 0;
  // La livraison standard est offerte au-delà du seuil.
  if (method === 'standard' && subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return getShippingMethod(method).price;
};

export interface CartTotals {
  count: number;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  freeShippingGap: number;
}

export const computeCartTotals = (
  lines: CartLine[],
  promo: CartState['promo'],
  method: ShippingMethodId,
): CartTotals => {
  const subtotal = cartSubtotal(lines);
  const discount = cartDiscount(subtotal, promo);
  const shippingCost = cartShippingCost(subtotal, method);

  return {
    count: cartItemCount(lines),
    subtotal,
    discount,
    shippingCost,
    total: round(Math.max(0, subtotal - discount + shippingCost)),
    freeShippingGap: round(Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)),
  };
};

/** Hook prêt à l'emploi pour les écrans qui affichent des totaux. */
export const useCartTotals = (): CartTotals => {
  const lines = useCartStore((state) => state.lines);
  const promo = useCartStore((state) => state.promo);
  const method = useCartStore((state) => state.shippingMethod);
  return computeCartTotals(lines, promo, method);
};
