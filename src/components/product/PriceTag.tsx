import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing } from '@/theme';
import { discountPercent, effectivePrice, formatPrice } from '@/utils/format';

interface PriceTagProps {
  price: number;
  salePrice: number | null;
  /** `lg` pour la fiche produit, `md` pour les cartes, `sm` pour les listes. */
  size?: 'sm' | 'md' | 'lg';
  showDiscount?: boolean;
  /** Supplément lié à la variante sélectionnée, déjà inclus dans les montants. */
  vertical?: boolean;
}

export const PriceTag = ({
  price,
  salePrice,
  size = 'md',
  showDiscount = true,
  vertical = false,
}: PriceTagProps) => {
  const current = effectivePrice(price, salePrice);
  const discount = discountPercent(price, salePrice);
  const hasPromo = discount > 0;

  const currentVariant = size === 'lg' ? 'title' : size === 'md' ? 'subheading' : 'bodyStrong';

  return (
    <View style={[styles.container, vertical ? styles.vertical : null]}>
      <AppText variant={currentVariant} color={colors.ink}>
        {formatPrice(current)}
      </AppText>

      {hasPromo ? (
        <View style={styles.promoRow}>
          <AppText
            variant={size === 'lg' ? 'body' : 'caption'}
            color={colors.mutedLight}
            style={styles.strike}
          >
            {formatPrice(price)}
          </AppText>

          {showDiscount ? <Badge label={`-${discount} %`} tone="danger" /> : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  vertical: { flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  strike: { textDecorationLine: 'line-through' },
});
