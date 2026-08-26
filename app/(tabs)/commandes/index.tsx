import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { OrderStatusBadge } from '@/components/orders/OrderTimeline';
import { TicketActions } from '@/components/orders/TicketActions';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  ListSkeleton,
  ScreenHeader,
} from '@/components/ui';
import { db } from '@/data';
import { useAsync } from '@/hooks/useAsync';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/store/auth';
import { rememberGuestOrderEmail } from '@/store/guestOrder';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatDate, formatPrice, pluralize } from '@/utils/format';

const OrderLookup = () => {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const needle = reference.trim().toUpperCase();
    const mail = email.trim().toLowerCase();
    if (!needle) {
      toast.error('Saisissez le numéro de commande (ex. BAB-…).');
      return;
    }
    if (!mail.includes('@')) {
      toast.error('Indiquez l’email utilisé lors de la commande.');
      return;
    }

    setBusy(true);
    try {
      const order = await db.getOrderByReference(needle, mail);
      if (!order) {
        toast.error('Aucune commande ne correspond à cette référence et cet email.');
        return;
      }
      rememberGuestOrderEmail(order.reference, mail);
      router.push(`/commandes/${order.reference}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.lookup}>
      <AppText variant="captionStrong">Suivre une commande</AppText>
      <AppText variant="caption">
        Indiquez le numéro figurant sur votre confirmation, ainsi que l’email de la commande.
      </AppText>
      <Input
        placeholder="BAB-…"
        value={reference}
        onChangeText={setReference}
        autoCapitalize="characters"
        autoCorrect={false}
        onSubmitEditing={submit}
        returnKeyType="next"
      />
      <Input
        placeholder="Email de la commande"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        onSubmitEditing={submit}
        returnKeyType="go"
      />
      <Button label="Voir le suivi" onPress={submit} loading={busy} fullWidth />
    </Card>
  );
};

export default function OrdersScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { contentStyle } = useBreakpoint();

  const { data, loading, error, refreshing, reload } = useAsync(
    () => (user ? db.getOrders(user.id) : Promise.resolve([])),
    [user?.id],
  );

  const orders = data ?? [];

  if (!user) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Mes commandes" withStatusBar />
        <View style={[styles.content, contentStyle]}>
          <OrderLookup />
          <EmptyState
            icon="lock-closed-outline"
            title="Ou connectez-vous"
            message="Un compte permet de retrouver automatiquement toutes vos commandes."
            actionLabel="Se connecter"
            onAction={() => router.push('/auth/connexion')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Mes commandes"
        subtitle={loading ? undefined : pluralize(orders.length, 'commande')}
        withStatusBar
      />

      {loading ? (
        <View style={[styles.content, contentStyle]}>
          <ListSkeleton count={4} height={128} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Aucune commande pour l’instant"
          message="Vos commandes apparaîtront ici avec leur suivi détaillé, du paiement à la livraison."
          actionLabel="Découvrir nos produits"
          onAction={() => router.push('/categories')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.reference}
          contentContainerStyle={[styles.content, contentStyle]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Pressable
                  onPress={() => router.push(`/commandes/${item.reference}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Commande ${item.reference}`}
                  style={({ pressed }) => [styles.cardHeaderLeft, pressed ? styles.pressed : null]}
                >
                  <AppText variant="bodyStrong">{item.reference}</AppText>
                  <AppText variant="micro" color={colors.muted}>
                    {formatDate(item.created_at)}
                  </AppText>
                </Pressable>

                <View style={styles.cardHeaderRight}>
                  <TicketActions order={item} compact />
                  <OrderStatusBadge status={item.status} />
                </View>
              </View>

              <Pressable
                onPress={() => router.push(`/commandes/${item.reference}`)}
                accessibilityRole="button"
                accessibilityLabel={`Détail de la commande ${item.reference}`}
                style={({ pressed }) => [styles.cardBody, pressed ? styles.pressed : null]}
              >
                <AppText variant="caption" numberOfLines={2}>
                  {item.items.map((line) => `${line.quantity} × ${line.name}`).join(' · ')}
                </AppText>

                <View style={styles.cardFooter}>
                  <AppText variant="captionStrong">
                    {pluralize(
                      item.items.reduce((sum, line) => sum + line.quantity, 0),
                      'article',
                    )}
                  </AppText>

                  <View style={styles.cardFooterRight}>
                    <AppText variant="subheading">{formatPrice(item.total)}</AppText>
                    <Ionicons name="chevron-forward" size={17} color={colors.mutedLight} />
                  </View>
                </View>

                {item.tracking_number ? (
                  <View style={styles.tracking}>
                    <Ionicons name="cube-outline" size={13} color={colors.primary} />
                    <AppText variant="micro" color={colors.primary}>
                      Suivi : {item.tracking_number}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
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
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardHeaderLeft: { gap: 1, flex: 1 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardBody: { gap: spacing.sm },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  cardFooterRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tracking: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  lookup: { gap: spacing.sm, marginBottom: spacing.lg },
});
