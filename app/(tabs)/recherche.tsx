import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductRow } from '@/components/product/ProductRow';
import { AppText, Chip, EmptyState, ErrorState, ListSkeleton, SectionHeader } from '@/components/ui';
import { SearchBar } from '@/components/ui/SearchBar';
import { db } from '@/data';
import { emptyFilters } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchStore } from '@/store/search';
import { colors, layout, spacing } from '@/theme';
import { pluralize } from '@/utils/format';

/** Raccourcis proposés quand la barre de recherche est vide. */
const POPULAR_TERMS = [
  'iPhone 15',
  'MacBook',
  'Dell',
  'HP',
  'clavier',
  'souris',
  'SSD 1 To',
  'AirPods',
  'imprimante',
  'écran 4K',
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { screenPadding } = useBreakpoint();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 300);

  const history = useSearchStore((state) => state.history);
  const remember = useSearchStore((state) => state.remember);
  const forget = useSearchStore((state) => state.forget);
  const clearHistory = useSearchStore((state) => state.clear);

  const { data, loading, error, reload } = useAsync(
    () =>
      debounced.length >= 2
        ? db.getProducts({ ...emptyFilters, query: debounced, sort: 'relevance' }, 1, 24)
        : Promise.resolve(null),
    [debounced],
  );

  const results = data?.items ?? [];
  const searching = debounced.length >= 2;

  const submit = (term: string) => {
    setQuery(term);
    remember(term);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <View style={[styles.searchZone, { paddingHorizontal: screenPadding }]}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmit={() => submit(query)}
          autoFocus
          onFilterPress={() =>
            router.push(`/catalogue${query ? `?q=${encodeURIComponent(query)}` : ''}` as never)
          }
        />
      </View>

      {!searching ? (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => ''}
          contentContainerStyle={[styles.content, { paddingHorizontal: screenPadding }]}
          ListHeaderComponent={
            <View style={styles.suggestions}>
              {history.length > 0 ? (
                <View style={styles.block}>
                  <SectionHeader
                    title="Recherches récentes"
                    actionLabel="Effacer"
                    onAction={clearHistory}
                  />

                  <View style={styles.chipRow}>
                    {history.map((term) => (
                      <Chip
                        key={term}
                        label={term}
                        removable
                        onPress={() => forget(term)}
                        style={styles.chip}
                      />
                    ))}
                  </View>

                  <AppText variant="micro" color={colors.mutedLight}>
                    Touchez la croix pour retirer un terme, ou une suggestion ci-dessous pour lancer une recherche.
                  </AppText>
                </View>
              ) : null}

              <View style={styles.block}>
                <SectionHeader title="Suggestions populaires" />

                <View style={styles.chipRow}>
                  {POPULAR_TERMS.map((term) => (
                    <Chip key={term} label={term} onPress={() => submit(term)} icon="search" />
                  ))}
                </View>
              </View>

              <Pressable
                onPress={() => router.push('/catalogue')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.browseAll, pressed ? { opacity: 0.85 } : null]}
              >
                <Ionicons name="grid-outline" size={18} color={colors.primary} />
                <AppText variant="captionStrong" color={colors.primary}>
                  Parcourir tout le catalogue avec les filtres
                </AppText>
              </Pressable>
            </View>
          }
        />
      ) : loading ? (
        <View style={[styles.content, { paddingHorizontal: screenPadding }]}>
          <ListSkeleton count={5} height={102} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Aucun résultat"
          message={`Nous n’avons rien trouvé pour « ${debounced} ». Vérifiez l’orthographe ou essayez un terme plus court, comme « mac » ou « ssd ».`}
          actionLabel="Voir tout le catalogue"
          onAction={() => router.push('/catalogue')}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingHorizontal: screenPadding }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <AppText variant="caption" style={styles.resultCount}>
              {pluralize(data?.total ?? results.length, 'résultat')} pour « {debounced} »
            </AppText>
          }
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              onPress={() => {
                remember(debounced);
                router.push(`/produit/${item.id}`);
              }}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  searchZone: {
    paddingBottom: spacing.md,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  content: {
    paddingBottom: spacing.huge,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  suggestions: { gap: spacing.xxl, paddingTop: spacing.sm },
  block: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.surface },
  browseAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  resultCount: { marginBottom: spacing.md },
});
