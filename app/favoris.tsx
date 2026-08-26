import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProductCard } from '@/components/product/ProductCard';
import {
  AppText,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ProductGridSkeleton,
  ScreenHeader,
} from '@/components/ui';
import { db } from '@/data';
import { useAsync } from '@/hooks/useAsync';
import { useGrid } from '@/hooks/useGrid';
import { useFavoritesStore } from '@/store/favorites';
import { toast } from '@/store/toast';
import { colors, layout, spacing } from '@/theme';
import { pluralize } from '@/utils/format';

export default function FavoritesScreen() {
  const router = useRouter();
  const ids = useFavoritesStore((state) => state.ids);
  const toggle = useFavoritesStore((state) => state.toggle);
  const { columns, cardWidth } = useGrid();

  const [confirmClear, setConfirmClear] = useState(false);

  // La clé de rechargement dépend de la liste : retirer un favori met à jour l'écran.
  const key = useMemo(() => ids.join(','), [ids]);

  const { data, loading, error, reload } = useAsync(() => db.getProductsByIds(ids), [key]);

  const products = data ?? [];

  const clearAll = async () => {
    await Promise.all(ids.map((id) => toggle(id)));
    setConfirmClear(false);
    toast.info('Liste de favoris vidée.');
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Mes favoris"
        subtitle={ids.length > 0 ? pluralize(ids.length, 'produit') : undefined}
        withStatusBar
        right={
          ids.length > 0 ? (
            <Pressable
              onPress={() => setConfirmClear(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Vider les favoris"
            >
              <AppText variant="captionStrong" color={colors.danger}>
                Vider
              </AppText>
            </Pressable>
          ) : undefined
        }
      />

      {ids.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Aucun favori"
          message="Touchez le cœur sur un produit pour le retrouver ici et suivre ses baisses de prix."
          actionLabel="Parcourir le catalogue"
          onAction={() => router.push('/catalogue')}
        />
      ) : loading ? (
        <View style={styles.content}>
          <ProductGridSkeleton cardWidth={cardWidth} count={columns * 2} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} width={cardWidth} />
            ))}
          </View>
        </ScrollView>
      )}

      <ConfirmDialog
        visible={confirmClear}
        title="Vider les favoris ?"
        message="Tous les produits enregistrés seront retirés de votre liste."
        confirmLabel="Vider"
        destructive
        onConfirm={clearAll}
        onCancel={() => setConfirmClear(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
});
