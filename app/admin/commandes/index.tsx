import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { OrderStatusBadge } from '@/components/orders/OrderTimeline';
import {
  AppText,
  Chip,
  EmptyState,
  ErrorState,
  ListSkeleton,
  ScreenHeader,
} from '@/components/ui';
import { SearchBar } from '@/components/ui/SearchBar';
import { db } from '@/data';
import { ORDER_FLOW, ORDER_STATUS_LABELS } from '@/data/constants';
import { OrderStatus } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { colors, layout, radius, spacing } from '@/theme';
import { formatDateTime, formatPrice, pluralize } from '@/utils/format';

const STATUS_FILTERS: (OrderStatus | 'all')[] = ['all', ...ORDER_FLOW, 'cancelled'];

export default function AdminOrdersScreen() {
  const router = useRouter();
  // La fiche client ouvre cet écran pré-filtré sur son email.
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState(q ?? '');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');

  const debounced = useDebounce(query, 300);

  const { data, loading, error, refreshing, reload } = useAsync(
    () => db.adminListOrders(debounced, status),
    [debounced, status],
  );

  const orders = data ?? [];

  const revenue = orders
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Commandes"
        subtitle={
          loading
            ? undefined
            : `${pluralize(orders.length, 'commande')} · ${formatPrice(revenue)}`
        }
        withStatusBar
        onBack={() => router.replace('/admin')}
      />

      <View style={styles.toolbar}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Numéro, nom, téléphone ou email…"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            {STATUS_FILTERS.map((value) => (
              <Chip
                key={value}
                label={value === 'all' ? 'Toutes' : ORDER_STATUS_LABELS[value]}
                selected={status === value}
                onPress={() => setStatus(value)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.content}>
          <ListSkeleton count={6} height={116} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Aucune commande"
          message={
            query || status !== 'all'
              ? 'Aucune commande ne correspond à cette recherche.'
              : 'Les commandes des clients apparaîtront ici dès la première vente.'
          }
          actionLabel={query || status !== 'all' ? 'Réinitialiser' : undefined}
          onAction={() => {
            setQuery('');
            setStatus('all');
          }}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.reference}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/admin/commandes/${item.reference}`)}
              accessibilityRole="button"
              accessibilityLabel={`Commande ${item.reference}`}
              style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{item.reference}</AppText>
                  <AppText variant="micro" color={colors.muted}>
                    {formatDateTime(item.created_at)}
                  </AppText>
                </View>

                <OrderStatusBadge status={item.status} />
              </View>

              <View style={styles.customerRow}>
                <Ionicons name="person-outline" size={13} color={colors.muted} />
                <AppText variant="caption" numberOfLines={1} style={styles.flex}>
                  {item.customer_name} · {item.customer_phone}
                </AppText>
              </View>

              <View style={styles.cardFooter}>
                <AppText variant="micro" color={colors.muted}>
                  {pluralize(
                    item.items.reduce((sum, line) => sum + line.quantity, 0),
                    'article',
                  )}
                  {item.payment_status === 'pending' ? ' · paiement en attente' : ''}
                </AppText>

                <AppText variant="captionStrong">{formatPrice(item.total)}</AppText>
              </View>
            </Pressable>
          )}
        />
      )}
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
  filters: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
});
