import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ProductVisual } from '@/components/product/ProductVisual';
import {
  AppText,
  Badge,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ListSkeleton,
  ScreenHeader,
} from '@/components/ui';
import { SearchBar } from '@/components/ui/SearchBar';
import { db } from '@/data';
import { emptyFilters, Product } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatPrice, pluralize } from '@/utils/format';

type StockFilter = 'all' | 'in_stock' | 'low' | 'out';

const STOCK_FILTERS: { id: StockFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'in_stock', label: 'En stock' },
  { id: 'low', label: 'Stock faible' },
  { id: 'out', label: 'Rupture' },
];

export default function AdminProductsScreen() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const debounced = useDebounce(query, 300);

  const { data, loading, error, refreshing, reload } = useAsync(
    () =>
      db.getProducts({ ...emptyFilters, query: debounced, sort: 'newest' }, 1, 200),
    [debounced],
  );

  const products = useMemo(() => {
    const items = data?.items ?? [];

    return items.filter((product) => {
      if (stockFilter === 'in_stock') return product.stock > product.low_stock_threshold;
      if (stockFilter === 'low')
        return product.stock > 0 && product.stock <= product.low_stock_threshold;
      if (stockFilter === 'out') return product.stock === 0;
      return true;
    });
  }, [data, stockFilter]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      await db.adminDeleteProduct(pendingDelete.id);
      toast.success(`« ${pendingDelete.name} » supprimé.`);
      setPendingDelete(null);
      reload();
    } catch {
      toast.error('La suppression a échoué.');
      setPendingDelete(null);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Produits"
        subtitle={loading ? undefined : pluralize(products.length, 'produit')}
        withStatusBar
        onBack={() => router.replace('/admin')}
        right={
          <Pressable
            onPress={() => router.push('/admin/produits/nouveau')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Ajouter un produit"
            style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </Pressable>
        }
      />

      <View style={styles.toolbar}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher par nom, marque, référence…"
        />

        <View style={styles.filters}>
          {STOCK_FILTERS.map((filter) => (
            <Chip
              key={filter.id}
              label={filter.label}
              selected={stockFilter === filter.id}
              onPress={() => setStockFilter(filter.id)}
            />
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.content}>
          <ListSkeleton count={6} height={82} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Aucun produit"
          message={
            query
              ? `Aucun résultat pour « ${query} ». Essayez un autre terme.`
              : 'Ajoutez votre premier produit pour alimenter le catalogue.'
          }
          actionLabel="Ajouter un produit"
          onAction={() => router.push('/admin/produits/nouveau')}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/admin/produits/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            >
              <View style={styles.thumb}>
                <ProductVisual
                  uri={item.images[0]}
                  productId={item.id}
                  categoryId={item.category_id}
                  size={54}
                />
              </View>

              <View style={styles.body}>
                <AppText variant="captionStrong" numberOfLines={1}>
                  {item.name}
                </AppText>

                <AppText variant="micro" color={colors.muted} numberOfLines={1}>
                  {item.brand} · {item.sku}
                </AppText>

                <View style={styles.badges}>
                  <AppText variant="captionStrong">
                    {formatPrice(item.sale_price ?? item.price)}
                  </AppText>

                  <Badge
                    label={item.stock === 0 ? 'Rupture' : `Stock ${item.stock}`}
                    tone={
                      item.stock === 0
                        ? 'danger'
                        : item.stock <= item.low_stock_threshold
                          ? 'warning'
                          : 'success'
                    }
                  />

                  {!item.is_active ? <Badge label="Masqué" tone="neutral" /> : null}
                </View>
              </View>

              <Pressable
                onPress={() => setPendingDelete(item)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Supprimer ${item.name}`}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Supprimer ce produit ?"
        message={
          pendingDelete
            ? `« ${pendingDelete.name} » sera retiré du catalogue. Les commandes passées ne sont pas modifiées.`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  toolbar: {
    padding: layout.screenPadding,
    paddingBottom: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  body: { flex: 1, gap: 3 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
