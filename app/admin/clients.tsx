import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import {
  AppText,
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ListSkeleton,
  ScreenHeader,
  Sheet,
} from '@/components/ui';
import { SearchBar } from '@/components/ui/SearchBar';
import { db } from '@/data';
import { RepositoryError } from '@/data/repository';
import { CustomerSummary } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatDate, formatPrice, pluralize } from '@/utils/format';

export default function AdminCustomersScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CustomerSummary | null>(null);
  const [confirmPromote, setConfirmPromote] = useState<CustomerSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const debounced = useDebounce(query, 300);

  const { data, loading, error, refreshing, reload } = useAsync(
    () => db.adminListCustomers(debounced),
    [debounced],
  );

  const customers = data ?? [];

  const toggleRole = async (customer: CustomerSummary) => {
    setBusy(true);

    try {
      const nextRole = customer.user.role === 'admin' ? 'customer' : 'admin';
      await db.adminSetUserRole(customer.user.id, nextRole);

      toast.success(
        nextRole === 'admin'
          ? `${customer.user.first_name} est désormais administrateur.`
          : `${customer.user.first_name} redevient client.`,
      );

      setConfirmPromote(null);
      setSelected(null);
      reload();
    } catch (caught) {
      toast.error(
        caught instanceof RepositoryError ? caught.message : 'Le changement de rôle a échoué.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Clients"
        subtitle={loading ? undefined : pluralize(customers.length, 'client')}
        withStatusBar
        onBack={() => router.replace('/admin')}
      />

      <View style={styles.toolbar}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Nom, email ou téléphone…"
        />
      </View>

      {loading ? (
        <View style={styles.content}>
          <ListSkeleton count={6} height={80} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Aucun client"
          message={
            query
              ? `Aucun client ne correspond à « ${query} ».`
              : 'Les comptes clients apparaîtront ici après les premières inscriptions.'
          }
        />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelected(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.user.first_name} ${item.user.last_name}`}
              style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            >
              <Avatar
                firstName={item.user.first_name}
                lastName={item.user.last_name}
                uri={item.user.avatar_url}
                size={44}
              />

              <View style={styles.body}>
                <View style={styles.nameRow}>
                  <AppText variant="captionStrong" numberOfLines={1} style={styles.flex}>
                    {item.user.first_name} {item.user.last_name}
                  </AppText>

                  {item.user.role === 'admin' ? <Badge label="Admin" tone="primary" /> : null}
                </View>

                <AppText variant="micro" color={colors.muted} numberOfLines={1}>
                  {item.user.email}
                </AppText>

                <AppText variant="micro" color={colors.mutedLight}>
                  {pluralize(item.orders_count, 'commande')} · {formatPrice(item.total_spent)}
                </AppText>
              </View>

              <Ionicons name="chevron-forward" size={17} color={colors.mutedLight} />
            </Pressable>
          )}
        />
      )}

      <Sheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title="Fiche client"
      >
        {selected ? (
          <>
            <View style={styles.detailHeader}>
              <Avatar
                firstName={selected.user.first_name}
                lastName={selected.user.last_name}
                uri={selected.user.avatar_url}
                size={64}
              />

              <View style={styles.flex}>
                <AppText variant="subheading">
                  {selected.user.first_name} {selected.user.last_name}
                </AppText>
                <AppText variant="caption">{selected.user.email}</AppText>
                <AppText variant="micro" color={colors.muted}>
                  Inscrit le {formatDate(selected.user.created_at)}
                </AppText>
              </View>
            </View>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <AppText variant="micro" color={colors.muted}>
                  Commandes
                </AppText>
                <AppText variant="heading">{selected.orders_count}</AppText>
              </View>

              <View style={styles.metric}>
                <AppText variant="micro" color={colors.muted}>
                  Total dépensé
                </AppText>
                <AppText variant="heading">{formatPrice(selected.total_spent)}</AppText>
              </View>

              <View style={styles.metric}>
                <AppText variant="micro" color={colors.muted}>
                  Dernière commande
                </AppText>
                <AppText variant="captionStrong">
                  {selected.last_order_at ? formatDate(selected.last_order_at) : 'Aucune'}
                </AppText>
              </View>
            </View>

            <View style={styles.detailActions}>
              <Button
                label="Appeler"
                variant="outline"
                size="sm"
                icon="call-outline"
                onPress={() =>
                  Linking.openURL(`tel:${selected.user.phone.replace(/\s/g, '')}`).catch(() =>
                    toast.error('Impossible de lancer l’appel.'),
                  )
                }
                style={styles.flex}
              />

              <Button
                label="Email"
                variant="outline"
                size="sm"
                icon="mail-outline"
                onPress={() =>
                  Linking.openURL(`mailto:${selected.user.email}`).catch(() =>
                    toast.error('Aucune application email configurée.'),
                  )
                }
                style={styles.flex}
              />
            </View>

            <Button
              label="Voir ses commandes"
              variant="secondary"
              icon="receipt-outline"
              onPress={() => {
                const email = selected.user.email;
                setSelected(null);
                router.push(`/admin/commandes?q=${encodeURIComponent(email)}`);
              }}
              fullWidth
            />

            {selected.user.id !== currentUser?.id ? (
              <Button
                label={
                  selected.user.role === 'admin'
                    ? 'Retirer les droits administrateur'
                    : 'Promouvoir administrateur'
                }
                variant={selected.user.role === 'admin' ? 'ghost' : 'outline'}
                icon="shield-checkmark-outline"
                onPress={() => setConfirmPromote(selected)}
                fullWidth
              />
            ) : (
              <AppText variant="micro" color={colors.muted} center>
                Vous ne pouvez pas modifier votre propre rôle.
              </AppText>
            )}
          </>
        ) : null}
      </Sheet>

      <ConfirmDialog
        visible={confirmPromote !== null}
        title={
          confirmPromote?.user.role === 'admin'
            ? 'Retirer les droits administrateur ?'
            : 'Promouvoir ce client ?'
        }
        message={
          confirmPromote?.user.role === 'admin'
            ? 'Ce compte perdra l’accès à l’espace administrateur.'
            : 'Ce compte pourra gérer les produits, le stock et les commandes.'
        }
        confirmLabel="Confirmer"
        destructive={confirmPromote?.user.role === 'admin'}
        onConfirm={() => confirmPromote && toggleRole(confirmPromote)}
        onCancel={() => setConfirmPromote(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  toolbar: {
    padding: layout.screenPadding,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
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
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  metric: {
    flex: 1,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  detailActions: { flexDirection: 'row', gap: spacing.sm },
});
