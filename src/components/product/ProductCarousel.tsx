import { FlatList, StyleSheet, View } from 'react-native';

import { ProductCardSkeleton, SectionHeader } from '@/components/ui';
import { Product } from '@/data/types';
import { spacing } from '@/theme';
import { ProductCard } from './ProductCard';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  loading?: boolean;
  cardWidth: number;
  onSeeAll?: () => void;
}

/** Liste horizontale de produits, réutilisée pour toutes les sections de l'accueil. */
export const ProductCarousel = ({
  title,
  subtitle,
  products,
  loading = false,
  cardWidth,
  onSeeAll,
}: ProductCarouselProps) => {
  if (!loading && products.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={onSeeAll ? 'Tout voir' : undefined}
        onAction={onSeeAll}
      />

      {loading ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2].map((index) => (
            <ProductCardSkeleton key={index} width={cardWidth} />
          ))}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  list: { gap: spacing.md, paddingRight: spacing.lg, paddingVertical: spacing.xs },
  skeletonRow: { flexDirection: 'row', gap: spacing.md },
});
