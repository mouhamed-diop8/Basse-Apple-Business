import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { StatCard } from '@/components/admin/Charts';
import { ProductVisual } from '@/components/product/ProductVisual';
import {
  AppText,
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  ListSkeleton,
  ScreenHeader,
  Sheet,
} from '@/components/ui';
import { SearchBar } from '@/components/ui/SearchBar';
import { db } from '@/data';
import { emptyFilters, Product } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatNumber, pluralize } from '@/utils/format';

type Filter = 'alerts' | 'out' | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'alerts', label: 'Alertes' },
  { id: 'out', label: 'Ruptures' },
  { id: 'all', label: 'Tout le catalogue' },
];

const QUICK_STEPS = [1, 5, 10, 25];

export default function AdminStockScreen() {
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('alerts');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockDraft, setStockDraft] = useState('0');
  const [saving, setSaving] = useState(false);

  const debounced = useDebounce(query, 300);

  const { data, loading, error, refreshing, reload } = useAsync(
    () => db.getProducts({ ...emptyFilters, query: debounced, sort: 'newest' }, 1, 300),
    [debounced],
  );

  const all = data?.items ?? [];

  const products = useMemo(() => {
    const filtered =
      filter === 'out'
        ? all.filter((product) => product.stock === 0)
        : filter === 'alerts'
          ? all.filter((product) => product.stock <= product.low_stock_threshold)
          : all;

    return [...filtered].sort((a, b) => a.stock - b.stock);
  }, [all, filter]);

  const outCount = all.filter((product) => product.stock === 0).length;
  const lowCount = all.filter(
    (product) => product.stock > 0 && product.stock <= product.low_stock_threshold,
  ).length;
  const totalUnits = all.reduce((sum, product) => sum + product.stock, 0);

  const openEditor = (product: Product) => {
    setEditing(product);
    setStockDraft(String(product.stock));
  };

  const applyStock = async (value: number) => {
    if (!editing) return;

    setSaving(true);

    try {
      await db.adminSetStock(editing.id, Math.max(0, Math.round(value)));
      toast.success(`Stock de « ${editing.name} » mis à jour.`);
      setEditing(null);
      reload();
    } catch {
      toast.error('La mise à jour du stock a échoué.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Gestion du stock"
        subtitle={loading ? undefined : pluralize(products.length, 'produit')}
        withStatusBar
        onBack={() => router.replace('/admin')}
      />

      <View style={styles.toolbar}>
        <View style={styles.stats}>
          <StatCard
            label="Ruptures"
            value={formatNumber(outCount)}
            icon="close-circle-outline"
            tone={outCount > 0 ? 'danger' : 'success'}
          />
          <StatCard
            label="Stock faible"
            value={formatNumber(lowCount)}
            icon="alert-circle-outline"
            tone={lowCount > 0 ? 'warning' : 'success'}
          />
          <StatCard
            label="Unités"
            value={formatNumber(totalUnits)}
            icon="layers-outline"
            tone="primary"
          />
        </View>

        <SearchBar value={query} onChangeText={setQuery} placeholder="Rechercher un produit…" />

        <View style={styles.filters}>
          {FILTERS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={filter === item.id}
              onPress={() => setFilter(item.id)}
            />
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.content}>
          <ListSkeleton count={6} height={76} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title={filter === 'all' ? 'Aucun produit' : 'Aucune alerte de stock'}
          message={
            filter === 'all'
              ? 'Le catalogue est vide pour cette recherche.'
              : 'Tous les produits sont au-dessus de leur seuil d’alerte.'
          }
          actionLabel="Voir tout le catalogue"
          onAction={() => setFilter('all')}
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
              onPress={() => openEditor(item)}
              accessibilityRole="button"
              accessibilityLabel={`Modifier le stock de ${item.name}`}
              style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            >
              <View style={styles.thumb}>
                <ProductVisual
                  uri={item.images[0]}
                  productId={item.id}
                  categoryId={item.category_id}
                  size={48}
                />
              </View>

              <View style={styles.body}>
                <AppText variant="captionStrong" numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText variant="micro" color={colors.muted}>
                  Seuil {item.low_stock_threshold} · {item.sku}
                </AppText>
              </View>

              <Badge
                label={item.stock === 0 ? 'Rupture' : `${item.stock} en stock`}
                tone={
                  item.stock === 0
                    ? 'danger'
                    : item.stock <= item.low_stock_threshold
                      ? 'warning'
                      : 'success'
                }
              />

              <Ionicons name="create-outline" size={18} color={colors.mutedLight} />
            </Pressable>
          )}
        />
      )}

      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title="Mettre à jour le stock"
        footer={
          <Button
            label="Enregistrer"
            onPress={() => applyStock(Number(stockDraft) || 0)}
            loading={saving}
            fullWidth
            size="lg"
          />
        }
      >
        {editing ? (
          <>
            <View style={styles.editorHeader}>
              <View style={styles.editorThumb}>
                <ProductVisual
                  uri={editing.images[0]}
                  productId={editing.id}
                  categoryId={editing.category_id}
                  size={56}
                />
              </View>

              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={2}>
                  {editing.name}
                </AppText>
                <AppText variant="micro" color={colors.muted}>
                  Stock actuel : {editing.stock} · seuil {editing.low_stock_threshold}
                </AppText>
              </View>
            </View>

            <Input
              label="Nouvelle quantité"
              value={stockDraft}
              onChangeText={(value) => setStockDraft(value.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />

            <View style={styles.quickRow}>
              {QUICK_STEPS.map((step) => (
                <Chip
                  key={`plus-${step}`}
                  label={`+${step}`}
                  onPress={() => setStockDraft(String((Number(stockDraft) || 0) + step))}
                />
              ))}
            </View>

            <View style={styles.quickRow}>
              {QUICK_STEPS.map((step) => (
                <Chip
                  key={`minus-${step}`}
                  label={`−${step}`}
                  onPress={() =>
                    setStockDraft(String(Math.max(0, (Number(stockDraft) || 0) - step)))
                  }
                />
              ))}
              <Chip label="Rupture" onPress={() => setStockDraft('0')} />
            </View>

            <Button
              label="Ouvrir la fiche produit"
              variant="ghost"
              size="sm"
              icon="open-outline"
              onPress={() => {
                const id = editing.id;
                setEditing(null);
                router.push(`/admin/produits/${id}`);
              }}
            />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  toolbar: {
    padding: layout.screenPadding,
    paddingBottom: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stats: { flexDirection: 'row', gap: spacing.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
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
  pressed: { backgroundColor: colors.surfaceAlt },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  body: { flex: 1, gap: 2 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  editorThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
