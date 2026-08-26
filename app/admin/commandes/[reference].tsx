import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { OrderStatusBadge, OrderTimeline } from '@/components/orders/OrderTimeline';
import { ProductVisual } from '@/components/product/ProductVisual';
import {
  AppText,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  EmptyState,
  Input,
  ListSkeleton,
  ScreenHeader,
  Sheet,
} from '@/components/ui';
import { db } from '@/data';
import {
  getPaymentMethod,
  getShippingMethod,
  ORDER_FLOW,
  ORDER_STATUS_LABELS,
} from '@/data/constants';
import { RepositoryError } from '@/data/repository';
import { Order, OrderStatus } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { useNotificationsStore } from '@/store/notifications';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatDateTime, formatPrice } from '@/utils/format';

export default function AdminOrderDetailScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const router = useRouter();

  const notifyStatusChange = useNotificationsStore((state) => state.notifyStatusChange);

  const { data, loading, error, reload, setData } = useAsync(
    () => db.getOrderByReference(reference),
    [reference],
  );

  const [statusSheet, setStatusSheet] = useState(false);
  const [trackingSheet, setTrackingSheet] = useState(false);
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const order = data;

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Commande" withStatusBar />
        <View style={styles.content}>
          <ListSkeleton count={4} height={130} />
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Commande" withStatusBar />
        <EmptyState
          icon={error ? 'cloud-offline-outline' : 'help-circle-outline'}
          tone={error ? 'danger' : 'neutral'}
          title={error ? 'Chargement impossible' : 'Commande introuvable'}
          message={error ?? 'Cette référence ne correspond à aucune commande.'}
          actionLabel={error ? 'Réessayer' : 'Retour aux commandes'}
          onAction={error ? reload : () => router.replace('/admin/commandes')}
        />
      </View>
    );
  }

  const shipping = getShippingMethod(order.shipping_method);
  const payment = getPaymentMethod(order.payment_method);
  const address = order.shipping_address;

  const currentIndex = ORDER_FLOW.indexOf(order.status);
  const nextStatus =
    order.status !== 'cancelled' && currentIndex < ORDER_FLOW.length - 1
      ? ORDER_FLOW[currentIndex + 1]
      : null;

  const apply = async (action: () => Promise<Order>, message: string, status?: OrderStatus) => {
    setBusy(true);

    try {
      const updated = await action();
      setData(updated);

      if (status) notifyStatusChange(updated, status);
      toast.success(message);
    } catch (caught) {
      toast.error(caught instanceof RepositoryError ? caught.message : 'L’opération a échoué.');
    } finally {
      setBusy(false);
      setPendingStatus(null);
      setStatusSheet(false);
      setTrackingSheet(false);
      setConfirmCancel(false);
      setNote('');
    }
  };

  const changeStatus = (status: OrderStatus) =>
    apply(
      () => db.adminUpdateOrderStatus(order.reference, status, note.trim() || undefined),
      `Statut mis à jour : ${ORDER_STATUS_LABELS[status]}.`,
      status,
    );

  const call = (phone: string) =>
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() =>
      toast.error('Impossible de lancer l’appel.'),
    );

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={order.reference}
        subtitle={formatDateTime(order.created_at)}
        withStatusBar
        onBack={() => router.replace('/admin/commandes')}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusHeaderLeft}>
              <AppText variant="micro" color={colors.muted}>
                Statut
              </AppText>
              <OrderStatusBadge status={order.status} />
            </View>

            <View style={styles.statusHeaderRight}>
              <AppText variant="micro" color={colors.muted}>
                Paiement
              </AppText>
              <Badge
                label={order.payment_status === 'paid' ? 'Réglé' : 'En attente'}
                tone={order.payment_status === 'paid' ? 'success' : 'warning'}
              />
            </View>
          </View>

          <View style={styles.actions}>
            {nextStatus ? (
              <Button
                label={`Passer à « ${ORDER_STATUS_LABELS[nextStatus]} »`}
                icon="arrow-forward-circle-outline"
                onPress={() => setPendingStatus(nextStatus)}
                loading={busy}
                fullWidth
              />
            ) : null}

            <View style={styles.actionRow}>
              <Button
                label="Changer le statut"
                variant="outline"
                size="sm"
                onPress={() => setStatusSheet(true)}
                style={styles.flex}
              />

              <Button
                label={order.tracking_number ? 'Modifier le suivi' : 'Ajouter un suivi'}
                variant="outline"
                size="sm"
                onPress={() => {
                  setTracking(order.tracking_number ?? '');
                  setTrackingSheet(true);
                }}
                style={styles.flex}
              />
            </View>

            {order.payment_status !== 'paid' && order.status !== 'cancelled' ? (
              <Button
                label="Confirmer le paiement reçu"
                variant="secondary"
                size="sm"
                icon="card-outline"
                onPress={() =>
                  apply(() => db.adminConfirmPayment(order.reference), 'Paiement confirmé.')
                }
                fullWidth
              />
            ) : null}

            {order.status !== 'cancelled' && order.status !== 'delivered' ? (
              <Button
                label="Annuler la commande"
                variant="ghost"
                size="sm"
                icon="close-circle-outline"
                onPress={() => setConfirmCancel(true)}
                fullWidth
              />
            ) : null}
          </View>
        </Card>

        <Card>
          <AppText variant="subheading" style={styles.cardHeading}>
            Historique
          </AppText>
          <OrderTimeline order={order} />
        </Card>

        <Card style={styles.customerCard}>
          <AppText variant="subheading">Client</AppText>

          <AppText variant="caption" style={styles.addressText}>
            {order.customer_name}
            {'\n'}
            {order.customer_email}
            {'\n'}
            {order.customer_phone}
          </AppText>

          <Divider style={styles.divider} />

          <AppText variant="captionStrong">Livraison · {shipping.label}</AppText>

          <AppText variant="caption" style={styles.addressText}>
            {address.address}
            {'\n'}
            {address.city} {address.district ? `· ${address.district}` : ''}
            {'\n'}
            {address.country}
          </AppText>

          {address.instructions ? (
            <View style={styles.instructions}>
              <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
              <AppText variant="micro" color={colors.muted} style={styles.flex}>
                {address.instructions}
              </AppText>
            </View>
          ) : null}

          <View style={styles.contactRow}>
            <Button
              label="Appeler"
              variant="outline"
              size="sm"
              icon="call-outline"
              onPress={() => call(order.customer_phone)}
              style={styles.flex}
            />

            <Button
              label="WhatsApp"
              variant="outline"
              size="sm"
              icon="logo-whatsapp"
              onPress={() =>
                Linking.openURL(
                  `https://wa.me/${order.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Bonjour, au sujet de votre commande ${order.reference} :`,
                  )}`,
                ).catch(() => toast.error('WhatsApp est indisponible.'))
              }
              style={styles.flex}
            />
          </View>
        </Card>

        <Card padded={false}>
          <View style={styles.itemsHeader}>
            <AppText variant="subheading">Articles</AppText>
          </View>

          {order.items.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <Divider /> : null}

              <Pressable
                onPress={() => router.push(`/admin/produits/${item.product_id}`)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
              >
                <View style={styles.thumb}>
                  <ProductVisual
                    uri={item.image || undefined}
                    productId={item.product_id}
                    categoryId=""
                    size={48}
                  />
                </View>

                <View style={styles.flex}>
                  <AppText variant="captionStrong" numberOfLines={2}>
                    {item.name}
                  </AppText>
                  <AppText variant="micro" color={colors.muted}>
                    {item.variant_label ? `${item.variant_label} · ` : ''}
                    {item.quantity} × {formatPrice(item.unit_price)}
                  </AppText>
                </View>

                <AppText variant="captionStrong">
                  {formatPrice(item.unit_price * item.quantity)}
                </AppText>
              </Pressable>
            </View>
          ))}

          <Divider />

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <AppText variant="caption">Sous-total</AppText>
              <AppText variant="captionStrong">{formatPrice(order.subtotal)}</AppText>
            </View>

            <View style={styles.totalRow}>
              <AppText variant="caption">Livraison</AppText>
              <AppText variant="captionStrong">
                {order.shipping_cost === 0 ? 'Offerte' : formatPrice(order.shipping_cost)}
              </AppText>
            </View>

            {order.discount > 0 ? (
              <View style={styles.totalRow}>
                <AppText variant="caption" color={colors.success}>
                  Réduction {order.promo_code ? `(${order.promo_code})` : ''}
                </AppText>
                <AppText variant="captionStrong" color={colors.success}>
                  -{formatPrice(order.discount)}
                </AppText>
              </View>
            ) : null}

            <View style={styles.totalRow}>
              <AppText variant="subheading">Total · {payment.label}</AppText>
              <AppText variant="subheading">{formatPrice(order.total)}</AppText>
            </View>
          </View>
        </Card>
      </ScrollView>

      <Sheet visible={statusSheet} onClose={() => setStatusSheet(false)} title="Changer le statut">
        <Input
          label="Note interne"
          placeholder="Optionnel : précision ajoutée à l’historique"
          value={note}
          onChangeText={setNote}
          multiline
        />

        {[...ORDER_FLOW, 'cancelled' as OrderStatus].map((status) => (
          <Pressable
            key={status}
            onPress={() => changeStatus(status)}
            disabled={busy || status === order.status}
            accessibilityRole="button"
            accessibilityLabel={ORDER_STATUS_LABELS[status]}
            style={({ pressed }) => [
              styles.statusOption,
              status === order.status ? styles.statusOptionCurrent : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <AppText
              variant="bodyStrong"
              color={status === 'cancelled' ? colors.danger : colors.ink}
            >
              {ORDER_STATUS_LABELS[status]}
            </AppText>

            {status === order.status ? (
              <AppText variant="micro" color={colors.muted}>
                Statut actuel
              </AppText>
            ) : (
              <Ionicons name="chevron-forward" size={17} color={colors.mutedLight} />
            )}
          </Pressable>
        ))}
      </Sheet>

      <Sheet
        visible={trackingSheet}
        onClose={() => setTrackingSheet(false)}
        title="Numéro de suivi"
        footer={
          <Button
            label="Enregistrer"
            onPress={() =>
              apply(
                () => db.adminSetTrackingNumber(order.reference, tracking.trim()),
                'Numéro de suivi enregistré.',
              )
            }
            loading={busy}
            disabled={tracking.trim().length === 0}
            fullWidth
            size="lg"
          />
        }
      >
        <Input
          label="Référence transporteur"
          placeholder="TS-2026-000123"
          value={tracking}
          onChangeText={setTracking}
          autoCapitalize="characters"
          hint="Communiqué au client sur sa page de suivi."
        />
      </Sheet>

      <ConfirmDialog
        visible={pendingStatus !== null}
        title="Confirmer le changement de statut ?"
        message={
          pendingStatus
            ? `La commande passera à « ${ORDER_STATUS_LABELS[pendingStatus]} » et le client sera notifié.`
            : undefined
        }
        confirmLabel="Confirmer"
        onConfirm={() => pendingStatus && changeStatus(pendingStatus)}
        onCancel={() => setPendingStatus(null)}
      />

      <ConfirmDialog
        visible={confirmCancel}
        title="Annuler cette commande ?"
        message="Le stock des articles est remis à disposition et le client est notifié."
        confirmLabel="Annuler la commande"
        destructive
        onConfirm={() => changeStatus('cancelled')}
        onCancel={() => setConfirmCancel(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    gap: spacing.md,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  statusCard: { gap: spacing.lg },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  statusHeaderLeft: { gap: spacing.xs, alignItems: 'flex-start' },
  statusHeaderRight: { gap: spacing.xs, alignItems: 'flex-end' },
  actions: { gap: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  cardHeading: { marginBottom: spacing.md },
  customerCard: { gap: spacing.sm },
  addressText: { lineHeight: 20 },
  divider: { marginVertical: spacing.sm },
  instructions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  itemsHeader: { padding: spacing.lg, paddingBottom: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  pressed: { backgroundColor: colors.surfaceAlt },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  totals: { padding: spacing.lg, gap: spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusOptionCurrent: { backgroundColor: colors.surfaceSunken, borderColor: colors.borderStrong },
});
