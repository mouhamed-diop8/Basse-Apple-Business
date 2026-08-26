import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { Product, ProductVariant } from '@/data/types';
import { useCartStore } from '@/store/cart';
import { toast } from '@/store/toast';
import { defaultVariantSelection } from '@/utils/product';

/**
 * Ajout au panier avec retour utilisateur immédiat (section 28). Utilisé par
 * les cartes produit — qui n'ont pas de sélecteur de variantes — et par la
 * fiche produit, qui fournit la sélection explicite.
 */
export const useAddToCart = () => {
  const addProduct = useCartStore((state) => state.addProduct);
  const router = useRouter();

  return useCallback(
    (product: Product, variants?: ProductVariant[], quantity = 1) => {
      if (product.stock <= 0) {
        toast.error(`« ${product.name} » est en rupture de stock.`);
        return false;
      }

      const selection = variants ?? defaultVariantSelection(product);
      const line = addProduct(product, selection, quantity);

      toast.success(`${product.name} ajouté au panier`, {
        actionLabel: 'Voir le panier',
        onAction: () => router.push('/panier'),
      });

      return line.quantity > 0;
    },
    [addProduct, router],
  );
};
