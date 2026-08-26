import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui';
import { Product } from '@/data/types';
import { colors, radius, spacing } from '@/theme';
import { BADGE_LABELS, productBadges } from '@/utils/product';
import { FALLBACK_GALLERY_SIZE } from '@/utils/visuals';
import { HeartButton } from './HeartButton';
import { ProductVisual } from './ProductVisual';

/**
 * Galerie de la fiche produit. Si le produit n'a pas de photo, on affiche
 * plusieurs visuels générés pour que le défilement reste cohérent.
 */
export const ProductGallery = ({ product, width }: { product: Product; width: number }) => {
  const [index, setIndex] = useState(0);

  const slides =
    product.images.length > 0
      ? product.images
      : Array.from({ length: FALLBACK_GALLERY_SIZE }, () => '');

  const badges = productBadges(product);
  const height = Math.min(width * 0.9, width > 700 ? 480 : 380);

  return (
    <View style={[styles.container, { height }]}>
      <FlatList
        data={slides}
        keyExtractor={(_, position) => `slide-${position}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index: position }) => (
          <View style={{ width, height }}>
            <ProductVisual
              uri={item || undefined}
              productId={product.id}
              categoryId={product.category_id}
              index={position}
              rounded={0}
            />
          </View>
        )}
      />

      <View style={styles.badges}>
        {badges.map((badge) => (
          <Badge
            key={badge}
            label={BADGE_LABELS[badge]}
            tone={badge === 'promo' ? 'danger' : badge === 'new' ? 'dark' : 'warning'}
          />
        ))}

        {product.condition === 'refurbished' ? (
          <Badge label="Reconditionné" tone="primary" />
        ) : null}
      </View>

      <HeartButton productId={product.id} size={22} style={styles.heart} />

      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((_, position) => (
            <View
              key={position}
              style={[styles.dot, position === index ? styles.dotActive : null]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, position: 'relative' },
  badges: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  heart: { position: 'absolute', top: spacing.lg, right: spacing.lg, width: 40, height: 40 },
  dots: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  dotActive: { width: 18, backgroundColor: colors.ink },
});
