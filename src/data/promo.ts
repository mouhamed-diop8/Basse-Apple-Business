import { formatPrice } from '@/utils/format';
import { RepositoryError } from './repository';
import { AppliedPromo, PromoCode } from './types';

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Valide un code et calcule la réduction. Lève une `RepositoryError` avec un
 * message directement affichable quand le code ne s'applique pas.
 */
export const applyPromo = (
  promo: PromoCode | undefined,
  subtotal: number,
): AppliedPromo => {
  if (!promo || !promo.is_active) {
    throw new RepositoryError('Ce code promo n’existe pas ou n’est plus actif.', 'invalid_promo');
  }

  if (new Date(promo.expiration_date).getTime() < Date.now()) {
    throw new RepositoryError('Ce code promo a expiré.', 'invalid_promo');
  }

  if (promo.usage_limit > 0 && promo.usage_count >= promo.usage_limit) {
    throw new RepositoryError('Ce code promo a atteint sa limite d’utilisation.', 'invalid_promo');
  }

  if (subtotal < promo.min_order) {
    throw new RepositoryError(
      `Ce code est valable à partir de ${formatPrice(promo.min_order)} d’achat.`,
      'invalid_promo',
    );
  }

  const raw = promo.type === 'percentage' ? (subtotal * promo.value) / 100 : promo.value;

  return {
    code: promo.code,
    type: promo.type,
    value: promo.value,
    // La réduction ne peut jamais dépasser le sous-total.
    amount: round(Math.min(raw, subtotal)),
  };
};

export const normalizeCode = (code: string): string => code.trim().toUpperCase();
