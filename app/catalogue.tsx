import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { FilterSheet } from '@/components/catalog/FilterSheet';
import { SortSheet, sortLabel } from '@/components/catalog/SortSheet';
import { ProductCard } from '@/components/product/ProductCard';
import {
  AppText,
  Chip,
  EmptyState,
  ErrorState,
  ProductGridSkeleton,
  ScreenHeader,
} from '@/components/ui';
import { SearchBar } from '@/components/ui/SearchBar';
import { db } from '@/data';
import { PAGE_SIZE } from '@/data/constants';
import { Facets } from '@/data/repository';
import { Category, Product, ProductFilters, SortOption, emptyFilters } from '@/data/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useGrid } from '@/hooks/useGrid';
import { colors, layout, spacing } from '@/theme';
import { formatPrice, pluralize } from '@/utils/format';

/** Nombre de critères actifs, affiché sur le bouton de filtres. */
const countActiveFilters = (filters: ProductFilters): number =>
  filters.categoryIds.length +
  filters.brands.length +
  filters.storageOptions.length +
  filters.ramOptions.length +
  filters.screenOptions.length +
  filters.colors.length +
  (filters.minPrice !== null ? 1 : 0) +
  (filters.maxPrice !== null ? 1 : 0) +
  (filters.inStockOnly ? 1 : 0) +
  (filters.onSaleOnly ? 1 : 0) +
  (filters.minRating !== null ? 1 : 0);

export default function CatalogueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    categorie?: string;
    q?: string;
    promo?: string;
    tri?: string;
  }>();

  const { cardWidth, gap, columns } = useGrid();
  const { screenPadding } = useBreakpoint();

  const [filters, setFilters] = useState<ProductFilters>(() => ({
    ...emptyFilters,
    query: params.q ?? '',
    categoryIds: params.categorie ? [params.categorie] : [],
    onSaleOnly: params.promo === '1',
    sort: (params.tri as SortOption) ?? (params.q ? 'relevance' : 'popular'),
  }));

  const [searchInput, setSearchInput] = useState(filters.query);
  const debouncedQuery = useDebounce(searchInput.trim(), 320);

  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const requestId = useRef(0);

  // La saisie de recherche alimente les filtres après stabilisation.
  useEffect(() => {
    setFilters((current) =>
      current.query === debouncedQuery ? current : { ...current, query: debouncedQuery },
    );
  }, [debouncedQuery]);

  useEffect(() => {
    Promise.all([db.getCategories(), db.getFacets()])
      .then(([loadedCategories, loadedFacets]) => {
        setCategories(loadedCategories);
        setFacets(loadedFacets);
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      const id = ++requestId.current;

      if (append) setLoadingMore(true);
      else setLoading(true);

      setError(null);

      try {
        const result = await db.getProducts(filters, targetPage, PAGE_SIZE);

        // Une réponse obsolète ne doit jamais écraser la plus récente.
        if (id !== requestId.current) return;

        setItems((current) => (append ? [...current, ...result.items] : result.items));
        setTotal(result.total);
        setHasMore(result.hasMore);
        setPage(targetPage);
      } catch {
        if (id === requestId.current) {
          setError('Impossible de charger le catalogue. Vérifiez votre connexion.');
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];

    filters.categoryIds.forEach((id) =>
      chips.push({
        key: `cat-${id}`,
        label: categories.find((category) => category.id === id)?.name ?? id,
        clear: () =>
          setFilters((current) => ({
            ...current,
            categoryIds: current.categoryIds.filter((value) => value !== id),
          })),
      }),
    );

    filters.brands.forEach((brand) =>
      chips.push({
        key: `brand-${brand}`,
        label: brand,
        clear: () =>
          setFilters((current) => ({
            ...current,
            brands: current.brands.filter((value) => value !== brand),
          })),
      }),
    );

    if (filters.onSaleOnly) {
      chips.push({
        key: 'promo',
        label: 'En promotion',
        clear: () => setFilters((current) => ({ ...current, onSaleOnly: false })),
      });
    }

    if (filters.inStockOnly) {
      chips.push({
        key: 'stock',
        label: 'En stock',
        clear: () => setFilters((current) => ({ ...current, inStockOnly: false })),
      });
    }

    if (filters.minRating !== null) {
      chips.push({
        key: 'rating',
        label: `${filters.minRating.toFixed(1)} ★ et plus`,
        clear: () => setFilters((current) => ({ ...current, minRating: null })),
      });
    }

    if (filters.minPrice !== null || filters.maxPrice !== null) {
      chips.push({
        key: 'price',
        label:
          filters.minPrice !== null && filters.maxPrice !== null
            ? `${formatPrice(filters.minPrice)} – ${formatPrice(filters.maxPrice)}`
            : filters.minPrice !== null
              ? `À partir de ${formatPrice(filters.minPrice)}`
              : `Jusqu’à ${formatPrice(filters.maxPrice!)}`,
        clear: () => setFilters((current) => ({ ...current, minPrice: null, maxPrice: null })),
      });
    }

    return chips;
  }, [filters, categories]);

  const title = filters.categoryIds.length === 1
    ? (categories.find((category) => category.id === filters.categoryIds[0])?.name ?? 'Catalogue')
    : 'Catalogue';

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={title}
        subtitle={loading ? undefined : pluralize(total, 'produit')}
        withStatusBar
        right={
          <Pressable
            onPress={() => setSortOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Trier les résultats"
            style={styles.sortButton}
          >
            <Ionicons name="swap-vertical-outline" size={18} color={colors.ink} />
          </Pressable>
        }
      />

      <View style={[styles.toolbar, { paddingHorizontal: screenPadding }]}>
        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          onFilterPress={() => setFiltersOpen(true)}
          activeFilterCount={activeCount}
          placeholder="Rechercher dans le catalogue…"
        />

        <View style={styles.metaRow}>
          <Pressable
            onPress={() => setSortOpen(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.sortPill, pressed ? { opacity: 0.85 } : null]}
          >
            <Ionicons name="swap-vertical-outline" size={14} color={colors.inkSoft} />
            <AppText variant="micro" color={colors.inkSoft}>
              {sortLabel(filters.sort)}
            </AppText>
          </Pressable>

          {activeChips.length > 0 ? (
            <FlatList
              data={activeChips}
              horizontal
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              renderItem={({ item }) => (
                <Chip label={item.label} selected removable onPress={item.clear} />
              )}
            />
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={[styles.list, { paddingHorizontal: screenPadding }]}>
          <ProductGridSkeleton cardWidth={cardWidth} count={columns * 3} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(1, false)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Aucun produit ne correspond"
          message={
            activeCount > 0
              ? 'Essayez d’élargir vos critères : retirez un filtre ou augmentez le prix maximum.'
              : 'Aucun produit disponible pour le moment. Revenez bientôt.'
          }
          actionLabel={activeCount > 0 ? 'Réinitialiser les filtres' : undefined}
          onAction={
            activeCount > 0
              ? () => setFilters({ ...emptyFilters, query: filters.query, sort: filters.sort })
              : undefined
          }
          secondaryActionLabel="Retour à l’accueil"
          onSecondaryAction={() => router.push('/')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          key={`grid-${columns}`}
          columnWrapperStyle={columns > 1 ? { gap } : undefined}
          contentContainerStyle={[styles.list, { gap, paddingHorizontal: screenPadding }]}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.45}
          onEndReached={() => {
            if (hasMore && !loadingMore) load(page + 1, true);
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : !hasMore && items.length > PAGE_SIZE ? (
              <AppText variant="micro" center style={styles.footer}>
                Vous avez vu les {total} produits correspondants.
              </AppText>
            ) : null
          }
          renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
        />
      )}

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        facets={facets}
        categories={categories}
        onApply={setFilters}
        resultCount={total}
      />

      <SortSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        value={filters.sort}
        onChange={(sort) => setFilters((current) => ({ ...current, sort }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  toolbar: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: spacing.huge,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  footer: { paddingVertical: spacing.xl },
});
