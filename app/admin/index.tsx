import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { BarChart, DonutChart, LineChart, StatCard } from '@/components/admin/Charts';
import { ProductVisual } from '@/components/product/ProductVisual';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  ListSkeleton,
  ScreenHeader,
  SectionHeader,
} from '@/components/ui';
import { asSupabaseRepository, db } from '@/data';
import { useAsync } from '@/hooks/useAsync';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatMoneyCompact, formatNumber, formatPrice } from '@/utils/format';

type Range = 'days' | 'months';

const SHORTCUTS: {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
}[] = [
  {
    label: 'Commandes',
    description: 'Traiter et suivre',
    icon: 'receipt-outline',
    href: '/admin/commandes',
  },
  {
    label: 'Produits',
    description: 'Ajouter et modifier',
    icon: 'cube-outline',
    href: '/admin/produits',
  },
  { label: 'Stock', description: 'Alertes et réassort', icon: 'layers-outline', href: '/admin/stock' },
  { label: 'Clients', description: 'Fiches et historique', icon: 'people-outline', href: '/admin/clients' },
  {
    label: 'Catégories',
    description: 'Organiser le catalogue',
    icon: 'grid-outline',
    href: '/admin/categories',
  },
  {
    label: 'Promotions',
    description: 'Codes et réductions',
    icon: 'pricetag-outline',
    href: '/admin/promotions',
  },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [range, setRange] = useState<Range>('days');
  const [importing, setImporting] = useState(false);
  const supabase = asSupabaseRepository();

  const { data: stats, loading, error, refreshing, reload } = useAsync(() => db.adminGetStats(), []);

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Tableau de bord" withStatusBar onBack={() => router.replace('/profil')} />
        <View style={styles.content}>
          <ListSkeleton count={5} height={110} />
        </View>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Tableau de bord" withStatusBar onBack={() => router.replace('/profil')} />
        <ErrorState message={error ?? undefined} onRetry={reload} />
      </View>
    );
  }

  const revenueSeries = range === 'days' ? stats.revenueByDay : stats.revenueByMonth;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Tableau de bord"
        subtitle={user ? `Connecté en tant que ${user.first_name}` : undefined}
        withStatusBar
        onBack={() => router.replace('/profil')}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsGrid}>
          <StatCard
            label="Chiffre d’affaires"
            value={formatMoneyCompact(stats.revenue)}
            icon="trending-up-outline"
            tone="success"
            hint={`Ce mois : ${formatMoneyCompact(stats.revenueMonth)}`}
          />
          <StatCard
            label="Commandes"
            value={formatNumber(stats.ordersCount)}
            icon="receipt-outline"
            tone="primary"
            hint={`${stats.ordersToday} aujourd’hui`}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="À traiter"
            value={formatNumber(stats.pendingOrders)}
            icon="alarm-outline"
            tone={stats.pendingOrders > 0 ? 'warning' : 'neutral'}
            hint="Commandes en attente"
          />
          <StatCard
            label="Panier moyen"
            value={formatMoneyCompact(stats.averageOrderValue)}
            icon="calculator-outline"
            hint={`${formatNumber(stats.unitsSold)} articles vendus`}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Clients"
            value={formatNumber(stats.customersCount)}
            icon="people-outline"
            tone="primary"
          />
          <StatCard
            label="Ruptures"
            value={formatNumber(stats.outOfStockCount)}
            icon="alert-circle-outline"
            tone={stats.outOfStockCount > 0 ? 'danger' : 'success'}
            hint={`${stats.lowStockCount} en stock faible`}
          />
        </View>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <AppText variant="subheading">Chiffre d’affaires</AppText>

            <View style={styles.rangeSwitch}>
              {(['days', 'months'] as Range[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setRange(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: range === value }}
                  style={[styles.rangeButton, range === value ? styles.rangeButtonActive : null]}
                >
                  <AppText
                    variant="micro"
                    color={range === value ? colors.white : colors.inkSoft}
                  >
                    {value === 'days' ? '14 jours' : '6 mois'}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <LineChart data={revenueSeries} />
        </Card>

        <Card style={styles.chartCard}>
          <AppText variant="subheading">Commandes par jour</AppText>
          <BarChart data={stats.ordersByDay} format={formatNumber} />
        </Card>

        {stats.salesByCategory.length > 0 ? (
          <Card style={styles.chartCard}>
            <AppText variant="subheading">Ventes par catégorie</AppText>
            <DonutChart data={stats.salesByCategory} />
          </Card>
        ) : null}

        <View>
          <SectionHeader
            title="Produits les plus vendus"
            actionLabel="Tous les produits"
            onAction={() => router.push('/admin/produits')}
          />

          <Card padded={false}>
            {stats.topProducts.slice(0, 5).map((entry, index) => (
              <View key={entry.product.id}>
                {index > 0 ? <Divider /> : null}

                <Pressable
                  onPress={() => router.push(`/admin/produits/${entry.product.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={entry.product.name}
                  style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
                >
                  <AppText variant="captionStrong" color={colors.mutedLight} style={styles.rank}>
                    {index + 1}
                  </AppText>

                  <View style={styles.thumb}>
                    <ProductVisual
                      uri={entry.product.images[0]}
                      productId={entry.product.id}
                      categoryId={entry.product.category_id}
                      size={44}
                    />
                  </View>

                  <View style={styles.rowBody}>
                    <AppText variant="captionStrong" numberOfLines={1}>
                      {entry.product.name}
                    </AppText>
                    <AppText variant="micro" color={colors.muted}>
                      {formatNumber(entry.units)} vendus · {formatPrice(entry.revenue)}
                    </AppText>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={colors.mutedLight} />
                </Pressable>
              </View>
            ))}
          </Card>
        </View>

        {stats.lowStockProducts.length > 0 ? (
          <View>
            <SectionHeader
              title="Alertes de stock"
              subtitle="Produits en rupture ou sous le seuil"
              actionLabel="Gérer"
              onAction={() => router.push('/admin/stock')}
            />

            <Card padded={false}>
              {stats.lowStockProducts.slice(0, 5).map((product, index) => (
                <View key={product.id}>
                  {index > 0 ? <Divider /> : null}

                  <Pressable
                    onPress={() => router.push('/admin/stock')}
                    accessibilityRole="button"
                    accessibilityLabel={product.name}
                    style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
                  >
                    <View style={styles.thumb}>
                      <ProductVisual
                        uri={product.images[0]}
                        productId={product.id}
                        categoryId={product.category_id}
                        size={44}
                      />
                    </View>

                    <View style={styles.rowBody}>
                      <AppText variant="captionStrong" numberOfLines={1}>
                        {product.name}
                      </AppText>
                      <AppText variant="micro" color={colors.muted}>
                        Seuil d’alerte : {product.low_stock_threshold}
                      </AppText>
                    </View>

                    <Badge
                      label={product.stock === 0 ? 'Rupture' : `${product.stock} restant`}
                      tone={product.stock === 0 ? 'danger' : 'warning'}
                    />
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        <View>
          <SectionHeader title="Gestion" />

          {supabase ? (
            <Card style={styles.importCard}>
              <AppText variant="captionStrong">Catalogue Supabase</AppText>
              <AppText variant="caption">
                Importe les catégories, produits, photos et codes promo de démonstration dans votre
                base. Vous pourrez ensuite les modifier dans Produits.
              </AppText>
              <Button
                label="Importer le catalogue"
                icon="cloud-upload-outline"
                loading={importing}
                onPress={async () => {
                  setImporting(true);
                  try {
                    const result = await supabase.importDemoCatalog();
                    toast.success(
                      `${result.products} produits, ${result.categories} catégories et ${result.promos} codes promo importés.`,
                    );
                    await reload();
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : 'Import impossible. Vérifiez vos droits admin.',
                    );
                  } finally {
                    setImporting(false);
                  }
                }}
              />
            </Card>
          ) : null}

          <View style={styles.shortcuts}>
            {SHORTCUTS.map((shortcut) => (
              <Pressable
                key={shortcut.href}
                onPress={() => router.push(shortcut.href as never)}
                accessibilityRole="button"
                accessibilityLabel={shortcut.label}
                style={({ pressed }) => [styles.shortcut, pressed ? styles.pressed : null]}
              >
                <View style={styles.shortcutIcon}>
                  <Ionicons name={shortcut.icon} size={20} color={colors.ink} />
                </View>

                <AppText variant="captionStrong">{shortcut.label}</AppText>
                <AppText variant="micro" color={colors.muted} numberOfLines={1}>
                  {shortcut.description}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    gap: spacing.md,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  chartCard: { gap: spacing.md },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rangeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    padding: 2,
  },
  rangeButton: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  rangeButtonActive: { backgroundColor: colors.black },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  pressed: { backgroundColor: colors.surfaceAlt },
  rank: { width: 16, textAlign: 'center' },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  rowBody: { flex: 1, gap: 2 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  shortcut: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 104,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  importCard: { gap: spacing.sm, marginBottom: spacing.md },
});
