import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Product } from '@/data/types';
import { colors, radius, spacing } from '@/theme';
import { BADGE_LABELS, productBadges, stockInfo } from '@/utils/product';
import { HeartButton } from './HeartButton';
import { PriceTag } from './PriceTag';
import { ProductVisual } from './ProductVisual';

interface ProductRowProps {
  product: Product;
  /** Contenu personnalisé à droite (ex. actions administrateur). */
  right?: React.ReactNode;
  onPress?: () => void;
  showFavorite?: boolean;
}

/** Présentation horizontale, utilisée en résultats de recherche et en admin. */
export const ProductRow = ({ product, right, onPress, showFavorite = true }: ProductRowProps) => {
  const router = useRouter();
  const stock = stockInfo(product);
  const badges = productBadges(product);
  const openProduct = onPress ?? (() => router.push(`/produit/${product.id}`));

  return (
    <View style={styles.row}>
      <Pressable
        onPress={openProduct}
        accessibilityRole="link"
        accessibilityLabel={product.name}
        style={({ pressed }) => [styles.main, pressed ? styles.pressed : null]}
      >
        <View style={styles.imageBox}>
          <ProductVisual
            uri={product.images[0]}
            productId={product.id}
            categoryId={product.category_id}
            size={78}
            rounded={radius.md}
          />
        </View>

        <View style={styles.body}>
          <AppText variant="micro" color={colors.muted} numberOfLines={1}>
            {product.brand}
          </AppText>

          <AppText variant="captionStrong" numberOfLines={2}>
            {product.name}
          </AppText>

          <Rating value={product.rating} count={product.reviews_count} size={11} />

          <View style={styles.metaRow}>
            <PriceTag price={product.price} salePrice={product.sale_price} size="sm" />
          </View>

          <View style={styles.badgeRow}>
            {badges.map((badge) => (
              <Badge
                key={badge}
                label={BADGE_LABELS[badge]}
                tone={badge === 'promo' ? 'danger' : badge === 'new' ? 'dark' : 'warning'}
              />
            ))}

            <Badge
              label={stock.label}
              tone={stock.tone === 'danger' ? 'danger' : stock.tone === 'warning' ? 'warning' : 'success'}
            />
          </View>
        </View>
      </Pressable>

      {right ?? (showFavorite ? <HeartButton productId={product.id} floating={false} /> : null)}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 },
  pressed: { opacity: 0.88 },
  imageBox: {
    width: 78,
    height: 78,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  body: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
});
