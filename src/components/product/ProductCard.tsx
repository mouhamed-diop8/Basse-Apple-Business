import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Product } from '@/data/types';
import { useAddToCart } from '@/hooks/useAddToCart';
import { colors, radius, shadow, spacing } from '@/theme';
import { BADGE_LABELS, productBadges, stockInfo } from '@/utils/product';
import { HeartButton } from './HeartButton';
import { PriceTag } from './PriceTag';
import { ProductVisual } from './ProductVisual';

interface ProductCardProps {
  product: Product;
  width: number;
  /** Masque le bouton d'ajout rapide (utile dans les carrousels compacts). */
  compact?: boolean;
}

export const ProductCard = ({ product, width, compact = false }: ProductCardProps) => {
  const router = useRouter();
  const addToCart = useAddToCart();
  const badges = productBadges(product);
  const stock = stockInfo(product);

  const openProduct = () => router.push(`/produit/${product.id}`);

  return (
    <View style={[styles.card, shadow.sm, { width }]}>
      <View style={[styles.imageBox, { height: width * 0.88 }]}>
        <Pressable
          onPress={openProduct}
          accessibilityRole="link"
          accessibilityLabel={`${product.name}, ${product.brand}`}
          style={styles.imageHit}
        >
          <ProductVisual
            uri={product.images[0]}
            productId={product.id}
            categoryId={product.category_id}
            rounded={radius.md}
          />
        </Pressable>

        <View style={styles.badgeStack} pointerEvents="none">
          {badges.map((badge) => (
            <Badge
              key={badge}
              label={BADGE_LABELS[badge]}
              tone={badge === 'promo' ? 'danger' : badge === 'new' ? 'dark' : 'warning'}
            />
          ))}
        </View>

        <HeartButton productId={product.id} style={styles.heart} />

        {!stock.available ? (
          <View style={styles.outOfStockOverlay} pointerEvents="none">
            <Badge label="Rupture de stock" tone="dark" />
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={openProduct}
        accessibilityRole="link"
        accessibilityLabel={product.name}
        style={({ pressed }) => [styles.body, pressed ? styles.pressed : null]}
      >
        <AppText variant="micro" color={colors.muted} numberOfLines={1}>
          {product.brand}
        </AppText>

        <AppText variant="captionStrong" numberOfLines={2} style={styles.name}>
          {product.name}
        </AppText>

        <Rating value={product.rating} count={product.reviews_count} size={11} />

        <PriceTag price={product.price} salePrice={product.sale_price} size="sm" vertical />
      </Pressable>

      <View style={styles.footer}>
        <AppText
          variant="micro"
          color={
            stock.tone === 'danger'
              ? colors.danger
              : stock.tone === 'warning'
                ? colors.warning
                : colors.success
          }
          numberOfLines={1}
          style={styles.stock}
        >
          {stock.label}
        </AppText>

        {!compact ? (
          <Pressable
            onPress={() => addToCart(product)}
            disabled={!stock.available}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Ajouter ${product.name} au panier`}
            style={({ pressed }) => [
              styles.addButton,
              !stock.available ? styles.addButtonDisabled : null,
              pressed && stock.available ? { opacity: 0.8 } : null,
            ]}
          >
            <Ionicons
              name={stock.available ? 'add' : 'close'}
              size={18}
              color={colors.white}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.94 },
  imageBox: {
    margin: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  imageHit: { flex: 1 },
  badgeStack: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  heart: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.md,
    gap: 3,
  },
  name: { minHeight: 34 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  stock: { flex: 1 },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: colors.mutedLight },
});
