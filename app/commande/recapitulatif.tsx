import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { ProductVisual } from '@/components/product/ProductVisual';
import { AppText, Card, Divider } from '@/components/ui';
import { db } from '@/data';
import { getPaymentMethod, getShippingMethod } from '@/data/constants';
import { RepositoryError } from '@/data/repository';
import { authorizePayment } from '@/services/payment';
import { useAuthStore } from '@/store/auth';
import { useCartStore, useCartTotals } from '@/store/cart';
import { useCheckoutStore } from '@/store/checkout';
import { useNotificationsStore } from '@/store/notifications';
import { toast } from '@/store/toast';
import { colors, radius, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';
import { maskCardNumber } from '@/utils/validation';

const SummaryRow = ({
  icon,
  label,
  value,
  onEdit,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onEdit: () => void;
}) => (
  <View style={styles.summaryRow}>
    <View style={styles.summaryIcon}>
      <Ionicons name={icon} size={17} color={colors.inkSoft} />
    </View>

    <View style={styles.summaryBody}>
      <AppText variant="micro" color={colors.muted}>
        {label}
      </AppText>
      <AppText variant="caption" color={colors.ink}>
        {value}
      </AppText>
    </View>

    <AppText variant="micro" color={colors.primary} onPress={onEdit} suppressHighlighting>
      Modifier
    </AppText>
  </View>
);

export default function CheckoutSummaryScreen() {
  const router = useRouter();

  const lines = useCartStore((state) => state.lines);
  const promo = useCartStore((state) => state.promo);
  const shippingMethod = useCartStore((state) => state.shippingMethod);
  const clearCart = useCartStore((state) => state.clear);
  const totals = useCartTotals();

  const contact = useCheckoutStore((state) => state.contact);
  const address = useCheckoutStore((state) => state.address);
  const paymentMethod = useCheckoutStore((state) => state.paymentMethod);
  const card = useCheckoutStore((state) => state.card);
  const mobileNumber = useCheckoutStore((state) => state.mobileNumber);
  const resetCheckout = useCheckoutStore((state) => state.reset);
  const setLastOrder = useCheckoutStore((state) => state.setLastOrder);

  const user = useAuthStore((state) => state.user);
  const notifyOrderCreated = useNotificationsStore((state) => state.notifyOrderCreated);

  const [submitting, setSubmitting] = useState(false);

  const shipping = getShippingMethod(shippingMethod);
  const payment = getPaymentMethod(paymentMethod);

  const paymentDetail =
    paymentMethod === 'card'
      ? `${payment.label} · ${maskCardNumber(card.number)}`
      : paymentMethod === 'mobile_money'
        ? `${payment.label} · ${mobileNumber}`
        : payment.label;

  const confirm = async () => {
    if (lines.length === 0) {
      router.replace('/panier');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Autorisation du paiement avant toute écriture de commande.
      const authorization = await authorizePayment({
        method: paymentMethod,
        amount: totals.total,
        cardNumber: card.number,
        mobileNumber,
      });

      if (!authorization.success) {
        toast.error(authorization.message ?? 'Le paiement a échoué.');
        setSubmitting(false);
        return;
      }

      // 2. Création de la commande : le stock est décrémenté côté données.
      const order = await db.createOrder({
        user_id: user?.id ?? null,
        items: lines.map((line) => ({
          product_id: line.product_id,
          name: line.name,
          image: line.image,
          variant_label: line.variant_label,
          quantity: line.quantity,
          unit_price: line.unit_price,
        })),
        subtotal: totals.subtotal,
        shipping_cost: totals.shippingCost,
        discount: totals.discount,
        total: totals.total,
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
        shipping_address: {
          first_name: contact.first_name,
          last_name: contact.last_name,
          phone: contact.phone,
          email: contact.email,
          ...address,
        },
        promo_code: promo?.code ?? null,
      });

      notifyOrderCreated(order);
      setLastOrder(order);
      clearCart();
      resetCheckout();

      router.replace(`/commande/confirmee/${order.reference}`);
    } catch (error) {
      toast.error(
        error instanceof RepositoryError
          ? error.message
          : 'La commande n’a pas pu être enregistrée. Réessayez.',
      );
      setSubmitting(false);
    }
  };

  return (
    <CheckoutShell
      step={4}
      title="Récapitulatif"
      subtitle="Vérifiez votre commande avant de confirmer."
      ctaLabel={`Confirmer la commande · ${formatPrice(totals.total)}`}
      ctaIcon="checkmark-circle-outline"
      onContinue={confirm}
      ctaLoading={submitting}
      ctaDisabled={lines.length === 0}
    >
      <Card padded={false}>
        {lines.map((line, index) => (
          <View key={line.key}>
            {index > 0 ? <Divider /> : null}

            <View style={styles.item}>
              <View style={styles.itemImage}>
                <ProductVisual
                  uri={line.image || undefined}
                  productId={line.product_id}
                  categoryId=""
                  size={54}
                />
              </View>

              <View style={styles.itemBody}>
                <AppText variant="captionStrong" numberOfLines={2}>
                  {line.name}
                </AppText>

                <AppText variant="micro" color={colors.muted}>
                  {line.variant_label ? `${line.variant_label} · ` : ''}Quantité {line.quantity}
                </AppText>
              </View>

              <AppText variant="captionStrong">
                {formatPrice(line.unit_price * line.quantity)}
              </AppText>
            </View>
          </View>
        ))}
      </Card>

      <Card padded={false}>
        <SummaryRow
          icon="person-outline"
          label="Client"
          value={`${contact.first_name} ${contact.last_name} · ${contact.phone}`}
          onEdit={() => router.push('/commande/informations')}
        />
        <Divider />
        <SummaryRow
          icon="location-outline"
          label="Livraison"
          value={`${address.address}, ${address.city}${address.district ? ` (${address.district})` : ''}, ${address.country}`}
          onEdit={() => router.push('/commande/adresse')}
        />
        <Divider />
        <SummaryRow
          icon={shipping.icon as never}
          label="Mode de livraison"
          value={`${shipping.label} · ${shipping.eta}`}
          onEdit={() => router.push('/commande/livraison')}
        />
        <Divider />
        <SummaryRow
          icon={payment.icon as never}
          label="Paiement"
          value={paymentDetail}
          onEdit={() => router.push('/commande/paiement')}
        />
      </Card>

      <Card style={styles.totals}>
        <View style={styles.totalRow}>
          <AppText variant="caption">Sous-total</AppText>
          <AppText variant="captionStrong">{formatPrice(totals.subtotal)}</AppText>
        </View>

        <View style={styles.totalRow}>
          <AppText variant="caption">Livraison</AppText>
          <AppText variant="captionStrong">
            {totals.shippingCost === 0 ? 'Offerte' : formatPrice(totals.shippingCost)}
          </AppText>
        </View>

        {totals.discount > 0 ? (
          <View style={styles.totalRow}>
            <AppText variant="caption" color={colors.success}>
              Réduction {promo ? `(${promo.code})` : ''}
            </AppText>
            <AppText variant="captionStrong" color={colors.success}>
              -{formatPrice(totals.discount)}
            </AppText>
          </View>
        ) : null}

        <Divider style={styles.totalDivider} />

        <View style={styles.totalRow}>
          <AppText variant="subheading">Montant total</AppText>
          <AppText variant="subheading">{formatPrice(totals.total)}</AppText>
        </View>
      </Card>

      <View style={styles.legal}>
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.muted} />
        <AppText variant="micro" color={colors.muted} style={styles.legalText}>
          En confirmant, vous acceptez nos conditions générales de vente et notre politique de
          confidentialité.
        </AppText>
      </View>
    </CheckoutShell>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  itemImage: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  itemBody: { flex: 1, gap: 2 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBody: { flex: 1, gap: 1 },
  totals: { gap: spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalDivider: { marginVertical: spacing.xs },
  legal: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  legalText: { flex: 1 },
});
