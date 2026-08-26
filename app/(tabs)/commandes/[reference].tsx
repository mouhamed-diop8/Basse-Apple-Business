import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { OrderStatusBadge, OrderTimeline } from '@/components/orders/OrderTimeline';
import { TicketActions } from '@/components/orders/TicketActions';
import { ProductVisual } from '@/components/product/ProductVisual';
import {
  AppText,
  Button,
  Card,
  Divider,
  EmptyState,
  ListSkeleton,
  ScreenHeader,
  SectionHeader,
} from '@/components/ui';
import { db } from '@/data';
import { getPaymentMethod, getShippingMethod, whatsappUrl } from '@/data/constants';
import { useAsync } from '@/hooks/useAsync';
import { guestOrderEmail } from '@/store/guestOrder';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatDateTime, formatPrice } from '@/utils/format';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Réglé',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

export default function OrderDetailScreen() {
  const { reference: rawReference } = useLocalSearchParams<{
    reference: string | string[];
  }>();
  const reference = (Array.isArray(rawReference) ? rawReference[0] : rawReference)?.trim() ?? '';
  const router = useRouter();

  const { data: order, loading, error, refreshing, reload } = useAsync(
    () => db.getOrderByReference(reference, guestOrderEmail(reference) ?? null),
    [reference],
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Commande" withStatusBar />
        <View style={styles.content}>
          <ListSkeleton count={3} height={140} />
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
          message={error ?? 'Cette commande n’existe pas ou ne vous appartient pas.'}
          actionLabel={error ? 'Réessayer' : 'Mes commandes'}
          onAction={error ? reload : () => router.replace('/commandes')}
        />
      </View>
    );
  }

  const shipping = getShippingMethod(order.shipping_method);
  const payment = getPaymentMethod(order.payment_method);
  const address = order.shipping_address;
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const contactSupport = () => {
    Linking.openURL(
      whatsappUrl(`Bonjour, je souhaite des informations sur ma commande ${order.reference}.`),
    ).catch(() => toast.error('WhatsApp n’est pas disponible sur cet appareil.'));
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={order.reference}
        subtitle={formatDateTime(order.created_at)}
        withStatusBar
        onBack={() => router.push('/commandes')}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
        }
      >
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusHeaderLeft}>
              <AppText variant="micro" color={colors.muted}>
                Statut actuel
              </AppText>
              <OrderStatusBadge status={order.status} />
            </View>

            <View style={styles.statusHeaderRight}>
              <AppText variant="micro" color={colors.muted}>
                Livraison estimée
              </AppText>
              <AppText variant="captionStrong">{order.eta}</AppText>
            </View>
          </View>

          {order.tracking_number ? (
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(order.tracking_number!);
                toast.success('Numéro de suivi copié.');
              }}
              accessibilityRole="button"
              accessibilityLabel="Copier le numéro de suivi"
              style={styles.trackingRow}
            >
              <Ionicons name="cube-outline" size={16} color={colors.primary} />
              <AppText variant="captionStrong" color={colors.primary} style={styles.trackingText}>
                Suivi transporteur : {order.tracking_number}
              </AppText>
              <Ionicons name="copy-outline" size={15} color={colors.primary} />
            </Pressable>
          ) : null}
        </Card>

        <TicketActions order={order} />

        <Card>
          <SectionHeader title="Suivi de la commande" />
          <OrderTimeline order={order} />
        </Card>

        <Card padded={false}>
          <View style={styles.cardTitle}>
            <AppText variant="subheading">
              Articles ({itemsCount})
            </AppText>
          </View>

          {order.items.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <Divider /> : null}

              <Pressable
                onPress={() => router.push(`/produit/${item.product_id}`)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
              >
                <View style={styles.itemImage}>
                  <ProductVisual
                    uri={item.image || undefined}
                    productId={item.product_id}
                    categoryId=""
                    size={58}
                  />
                </View>

                <View style={styles.itemBody}>
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
        </Card>

        <Card style={styles.totals}>
          <View style={styles.row}>
            <AppText variant="caption">Sous-total</AppText>
            <AppText variant="captionStrong">{formatPrice(order.subtotal)}</AppText>
          </View>

          <View style={styles.row}>
            <AppText variant="caption">Livraison ({shipping.label})</AppText>
            <AppText variant="captionStrong">
              {order.shipping_cost === 0 ? 'Offerte' : formatPrice(order.shipping_cost)}
            </AppText>
          </View>

          {order.discount > 0 ? (
            <View style={styles.row}>
              <AppText variant="caption" color={colors.success}>
                Réduction {order.promo_code ? `(${order.promo_code})` : ''}
              </AppText>
              <AppText variant="captionStrong" color={colors.success}>
                -{formatPrice(order.discount)}
              </AppText>
            </View>
          ) : null}

          <Divider style={styles.divider} />

          <View style={styles.row}>
            <AppText variant="subheading">Total</AppText>
            <AppText variant="subheading">{formatPrice(order.total)}</AppText>
          </View>

          <View style={styles.row}>
            <AppText variant="micro" color={colors.muted}>
              {payment.label}
            </AppText>
            <AppText
              variant="micro"
              color={order.payment_status === 'paid' ? colors.success : colors.warning}
            >
              {PAYMENT_STATUS_LABELS[order.payment_status]}
            </AppText>
          </View>
        </Card>

        <Card style={styles.addressCard}>
          <AppText variant="subheading">Adresse de livraison</AppText>

          <AppText variant="caption" style={styles.addressText}>
            {address.first_name} {address.last_name}
            {'\n'}
            {address.address}
            {'\n'}
            {address.city} {address.district ? `· ${address.district}` : ''}
            {'\n'}
            {address.country}
            {'\n'}
            {address.phone}
          </AppText>

          {address.instructions ? (
            <View style={styles.instructions}>
              <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
              <AppText variant="micro" color={colors.muted} style={styles.instructionsText}>
                {address.instructions}
              </AppText>
            </View>
          ) : null}
        </Card>

        <TicketActions order={order} />

        <Button
          label="Contacter le vendeur"
          variant="outline"
          icon="logo-whatsapp"
          onPress={contactSupport}
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  statusCard: { gap: spacing.md },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  statusHeaderLeft: { gap: spacing.xs, alignItems: 'flex-start' },
  statusHeaderRight: { gap: 2, alignItems: 'flex-end' },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  trackingText: { flex: 1 },
  cardTitle: { padding: spacing.lg, paddingBottom: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  pressed: { backgroundColor: colors.surfaceAlt },
  itemImage: {
    width: 58,
    height: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  itemBody: { flex: 1, gap: 2 },
  totals: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { marginVertical: spacing.xs },
  addressCard: { gap: spacing.sm },
  addressText: { lineHeight: 20 },
  instructions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  instructionsText: { flex: 1 },
});
