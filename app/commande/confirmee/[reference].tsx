import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductVisual } from '@/components/product/ProductVisual';
import { TicketActions } from '@/components/orders/TicketActions';
import { OrderTicketPreview } from '@/components/orders/OrderTicketPreview';
import { AppText, Button, Card, Divider, EmptyState, LoadingState, Reveal, SuccessBurst } from '@/components/ui';
import { db } from '@/data';
import { STORE, getPaymentMethod, getShippingMethod } from '@/data/constants';
import { useAsync } from '@/hooks/useAsync';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useCheckoutStore } from '@/store/checkout';
import { guestOrderEmail } from '@/store/guestOrder';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatDateTime, formatPrice } from '@/utils/format';

const paramValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? '';

export default function OrderConfirmedScreen() {
  const { reference: rawReference } = useLocalSearchParams<{
    reference: string | string[];
  }>();
  const reference = paramValue(rawReference);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { screenPadding } = useBreakpoint();

  const cached = useCheckoutStore((state) =>
    state.lastOrder?.reference === reference ? state.lastOrder : null,
  );

  const { data: fetched, loading } = useAsync(
    () =>
      reference
        ? db.getOrderByReference(
            reference,
            guestOrderEmail(reference) || cached?.customer_email,
          )
        : Promise.resolve(null),
    [reference, cached?.customer_email],
  );

  const order = fetched ?? cached;

  const shipping = order ? getShippingMethod(order.shipping_method) : null;
  const payment = order ? getPaymentMethod(order.payment_method) : null;
  const address = order?.shipping_address;

  const confirmationText = useMemo(() => {
    if (!order || !payment || !shipping) return '';
    const lines = order.items
      .map(
        (item) =>
          `• ${item.name}${item.variant_label ? ` (${item.variant_label})` : ''} × ${item.quantity} — ${formatPrice(item.unit_price * item.quantity)}`,
      )
      .join('\n');
    return [
      `Confirmation d’achat — ${STORE.name}`,
      `Commande ${order.reference}`,
      `Date : ${formatDateTime(order.created_at)}`,
      `Total : ${formatPrice(order.total)}`,
      `Paiement : ${payment.label}`,
      `Livraison : ${shipping.label} (${order.eta})`,
      '',
      lines,
      '',
      STORE.phone,
      STORE.address,
    ].join('\n');
  }, [order, payment, shipping]);

  if (loading && !order) {
    return (
      <View style={styles.root}>
        <LoadingState label="Préparation de votre confirmation d’achat…" />
      </View>
    );
  }

  if (!order || !shipping || !payment || !address) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon="help-circle-outline"
          title="Commande introuvable"
          message="Nous n’avons pas retrouvé cette commande. Consultez la liste de vos commandes."
          actionLabel="Mes commandes"
          onAction={() => router.replace('/commandes')}
        />
      </View>
    );
  }

  const sendConfirmation = async () => {
    const subject = `Confirmation d’achat ${order.reference} — ${STORE.name}`;
    const mailto = `mailto:${encodeURIComponent(order.customer_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(confirmationText)}`;
    try {
      await Share.share({ title: subject, message: confirmationText });
    } catch {
      const opened = await Linking.canOpenURL(mailto);
      if (opened) await Linking.openURL(mailto);
      else toast.error('Impossible de partager la confirmation.');
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { padding: screenPadding, paddingTop: insets.top + spacing.huge },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SuccessBurst />

        <Reveal delay={120}>
          <View style={styles.heading}>
            <AppText variant="title" center>
              Confirmation d’achat
            </AppText>
            <AppText variant="caption" center style={styles.headingText}>
              Merci {address.first_name}. Votre commande est enregistrée. Le PDF de confirmation
              se télécharge automatiquement et s’affiche ci-dessous.
            </AppText>
            <AppText variant="micro" center color={colors.muted}>
              Un exemplaire est associé à {order.customer_email}
            </AppText>
          </View>
        </Reveal>

        <Reveal delay={200}>
          <Card style={styles.referenceCard}>
            <AppText variant="micro" color={colors.muted}>
              Numéro de commande
            </AppText>

            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(order.reference);
                toast.success('Numéro de commande copié.');
              }}
              accessibilityRole="button"
              accessibilityLabel="Copier le numéro de commande"
              style={styles.referenceRow}
            >
              <AppText variant="heading">{order.reference}</AppText>
              <Ionicons name="copy-outline" size={17} color={colors.muted} />
            </Pressable>
          </Card>
        </Reveal>

        <Reveal delay={220}>
          <View style={styles.pdfBlock}>
            <AppText variant="subheading">Votre confirmation PDF</AppText>
            <AppText variant="caption" color={colors.muted}>
              Conservez ce PDF pour la livraison et le SAV. Vous pouvez le télécharger à nouveau
              ci-dessous.
            </AppText>
            <TicketActions order={order} />
            <OrderTicketPreview order={order} />
          </View>
        </Reveal>

        <Reveal delay={260}>
          <Card padded={false}>
            {order.items.map((item, index) => (
              <View key={item.id || `${item.product_id}-${index}`}>
                {index > 0 ? <Divider /> : null}
                <View style={styles.item}>
                  <View style={styles.itemImage}>
                    <ProductVisual
                      uri={item.image || undefined}
                      productId={item.product_id}
                      categoryId=""
                      size={54}
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
                </View>
              </View>
            ))}

            <Divider />

            <View style={styles.detailRow}>
              <AppText variant="caption">Total</AppText>
              <AppText variant="captionStrong">{formatPrice(order.total)}</AppText>
            </View>
            <Divider />
            <View style={styles.detailRow}>
              <AppText variant="caption">Paiement</AppText>
              <AppText variant="captionStrong">
                {payment.label}
                {order.payment_status === 'pending'
                  ? order.payment_method === 'cash_on_delivery'
                    ? ' (à la réception)'
                    : ' (en attente de confirmation)'
                  : ''}
              </AppText>
            </View>
            <Divider />
            <View style={styles.detailRow}>
              <AppText variant="caption">Livraison</AppText>
              <AppText variant="captionStrong">{shipping.label}</AppText>
            </View>
            <Divider />
            <View style={styles.detailColumn}>
              <AppText variant="caption">Adresse de livraison</AppText>
              <AppText variant="captionStrong" style={styles.addressText}>
                {address.first_name} {address.last_name}
                {'\n'}
                {address.address}
                {'\n'}
                {address.city} {address.district ? `· ${address.district}` : ''}
                {'\n'}
                {address.country}
              </AppText>
            </View>
            <Divider />
            <View style={styles.detailRow}>
              <AppText variant="caption">Délai estimé</AppText>
              <AppText variant="captionStrong" color={colors.primary}>
                {order.eta}
              </AppText>
            </View>
            <Divider />
            <View style={styles.detailRow}>
              <AppText variant="caption">Date</AppText>
              <AppText variant="captionStrong">{formatDateTime(order.created_at)}</AppText>
            </View>
          </Card>
        </Reveal>

        <Reveal delay={360}>
          <View style={styles.actions}>
            <Button
              label="Envoyer ma confirmation"
              variant="outline"
              icon="share-outline"
              onPress={sendConfirmation}
              fullWidth
            />

            <Button
              label="Suivre ma commande"
              variant="outline"
              icon="navigate-outline"
              onPress={() => router.replace(`/commandes/${order.reference}`)}
              fullWidth
            />

            <Button
              label="Continuer mes achats"
              variant="ghost"
              onPress={() => router.replace('/')}
              fullWidth
            />
          </View>
        </Reveal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    paddingBottom: spacing.huge,
    gap: spacing.xl,
    alignItems: 'stretch',
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  heading: { gap: spacing.xs },
  headingText: { maxWidth: 380, alignSelf: 'center' },
  referenceCard: { alignItems: 'center', gap: spacing.xs },
  referenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  itemImage: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  itemBody: { flex: 1, gap: 2 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  detailColumn: { gap: spacing.xs, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  addressText: { lineHeight: 20 },
  actions: { gap: spacing.sm },
  pdfBlock: { gap: spacing.md },
});
