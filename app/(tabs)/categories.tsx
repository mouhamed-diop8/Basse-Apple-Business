import { useRouter } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CategoryCard } from '@/components/home/CategoryCard';
import {
  AppText,
  Card,
  ErrorState,
  ListSkeleton,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { db } from '@/data';
import { useAsync } from '@/hooks/useAsync';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { colors, spacing } from '@/theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const { data, loading, error, refreshing, reload } = useAsync(() => db.getCategories(), []);

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
      }
      contentStyle={styles.content}
    >
      <SectionHeader
        title="Catégories"
        subtitle="Parcourez tout le catalogue par univers"
        style={styles.header}
      />

      {loading ? (
        <ListSkeleton count={8} height={70} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <View style={isDesktop ? styles.grid : styles.list}>
          {(data ?? []).map((category) => (
            <CategoryCard key={category.id} category={category} layout="tile" />
          ))}
        </View>
      )}

      <Card style={styles.allCard} onPress={() => router.push('/catalogue')}>
        <AppText variant="bodyStrong">Voir tout le catalogue</AppText>
        <AppText variant="caption">
          Tous les produits, avec recherche, filtres et tri
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl, gap: spacing.lg },
  header: { marginBottom: 0 },
  list: { gap: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  allCard: { gap: 2, marginTop: spacing.sm },
});
