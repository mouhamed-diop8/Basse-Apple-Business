import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryCard } from '@/components/home/CategoryCard';
import { PromoCarousel } from '@/components/home/PromoCarousel';
import { StoreHeader } from '@/components/home/StoreHeader';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import {
  AppText,
  Card,
  ErrorState,
  ProductGridSkeleton,
  Reveal,
  SectionHeader,
  Skeleton,
} from '@/components/ui';
import { db } from '@/data';
import { FREE_SHIPPING_THRESHOLD, RETURN_DAYS, STORE } from '@/data/constants';
import { emptyFilters } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useGrid } from '@/hooks/useGrid';
import { colors, layout, radius, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

const loadHome = async () => {
  const [categories, popular, promotions, newest] = await Promise.all([
    db.getCategories(),
    db.getProducts({ ...emptyFilters, sort: 'popular', inStockOnly: true }, 1, 10),
    db.getProducts({ ...emptyFilters, sort: 'promo', onSaleOnly: true }, 1, 8),
    db.getProducts({ ...emptyFilters, sort: 'newest' }, 1, 8),
  ]);

  return {
    categories,
    popular: popular.items,
    promotions: promotions.items,
    newest: newest.items,
  };
};

export default function HomeScreen() {
  const router = useRouter();
  const { isDesktop, isCompact, screenPadding, contentWidth } = useBreakpoint();
  const { cardWidth, gap, columns } = useGrid();
  const { data, loading, error, refreshing, reload } = useAsync(loadHome, []);

  const bannerWidth = contentWidth - screenPadding * 2;
  const popularCount = Math.min(columns * 2, 10);

  return (
    <View style={styles.root}>
      <StoreHeader />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
        }
      >
        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <Reveal>
              <View style={styles.section}>
                <PromoCarousel width={bannerWidth} height={isDesktop ? 260 : 186} />
              </View>
            </Reveal>

            <Reveal delay={80}>
              <Card style={[styles.perks, isCompact ? styles.perksCompact : null]} padded={false}>
                <View style={styles.perk}>
                  <Ionicons name="rocket-outline" size={18} color={colors.primary} />
                  <AppText variant="micro" color={colors.inkSoft} center>
                    Livraison offerte dès {formatPrice(FREE_SHIPPING_THRESHOLD)}
                  </AppText>
                </View>

                {isCompact ? null : <View style={styles.perkDivider} />}

                <View style={styles.perk}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                  <AppText variant="micro" color={colors.inkSoft} center>
                    Garantie 2 ans
                  </AppText>
                </View>

                {isCompact ? null : <View style={styles.perkDivider} />}

                <View style={styles.perk}>
                  <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                  <AppText variant="micro" color={colors.inkSoft} center>
                    Retour {RETURN_DAYS} jours
                  </AppText>
                </View>
              </Card>
            </Reveal>

            <Reveal delay={140}>
              <View style={styles.section}>
                <SectionHeader
                  title="Catégories populaires"
                  actionLabel="Tout voir"
                  onAction={() => router.push('/categories')}
                />

                {loading ? (
                  <View style={styles.pillRow}>
                    {[0, 1, 2, 3].map((index) => (
                      <Skeleton key={index} width={62} height={62} rounded={radius.lg} />
                    ))}
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pillRow}
                  >
                    {(data?.categories ?? []).map((category) => (
                      <CategoryCard key={category.id} category={category} layout="pill" />
                    ))}
                  </ScrollView>
                )}
              </View>
            </Reveal>

            <Reveal delay={200}>
              <View style={styles.section}>
                <SectionHeader
                  title="Produits populaires"
                  subtitle="Les plus achetés cette saison"
                  actionLabel="Tout voir"
                  onAction={() => router.push('/catalogue?tri=popular')}
                />

                {loading ? (
                  <ProductGridSkeleton cardWidth={cardWidth} count={4} />
                ) : (
                  <View style={[styles.grid, { gap }]}>
                    {(data?.popular ?? []).slice(0, popularCount).map((product) => (
                      <ProductCard key={product.id} product={product} width={cardWidth} />
                    ))}
                  </View>
                )}
              </View>
            </Reveal>

            <Reveal delay={260}>
              <View style={styles.section}>
                <ProductCarousel
                  title="Offres du moment"
                  subtitle="Promotions en cours, dans la limite des stocks"
                  products={data?.promotions ?? []}
                  loading={loading}
                  cardWidth={cardWidth}
                  onSeeAll={() => router.push('/catalogue?promo=1')}
                />
              </View>
            </Reveal>

            <Reveal delay={320}>
              <View style={styles.section}>
                <ProductCarousel
                  title="Nouveautés"
                  subtitle="Les derniers produits ajoutés"
                  products={data?.newest ?? []}
                  loading={loading}
                  cardWidth={cardWidth}
                  onSeeAll={() => router.push('/catalogue?tri=newest')}
                />
              </View>
            </Reveal>

            <Reveal delay={380}>
              <Card style={styles.helpCard} onPress={() => router.push('/contact')}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />

                <View style={styles.helpBody}>
                  <AppText variant="bodyStrong">Besoin d’un conseil ?</AppText>
                  <AppText variant="caption">
                    WhatsApp {STORE.phone} · {STORE.address}. {STORE.hours}
                  </AppText>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
              </Card>
            </Reveal>

            <AppText variant="micro" color={colors.muted} center>
              {STORE.disclaimer}
            </AppText>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  section: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  pillRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs },
  perks: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: spacing.md },
  perksCompact: { flexDirection: 'column', gap: spacing.sm, padding: spacing.md },
  perk: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  perkDivider: { width: 1, backgroundColor: colors.border },
  helpCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  helpBody: { flex: 1, gap: 2 },
});
