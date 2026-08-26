import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { AppText, Badge, Card } from '@/components/ui';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from '@/data/constants';
import { cartShippingCost, useCartStore, useCartTotals } from '@/store/cart';
import { colors, radius, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

export default function CheckoutShippingScreen() {
  const router = useRouter();
  const selected = useCartStore((state) => state.shippingMethod);
  const setShippingMethod = useCartStore((state) => state.setShippingMethod);
  const totals = useCartTotals();

  return (
    <CheckoutShell
      step={2}
      title="Mode de livraison"
      subtitle="Choisissez la formule qui vous convient."
      ctaLabel="Continuer vers le paiement"
      onContinue={() => router.push('/commande/paiement')}
    >
      <View style={styles.list}>
        {SHIPPING_METHODS.map((method) => {
          const active = method.id === selected;
          const price = cartShippingCost(totals.subtotal, method.id);
          const isFree = price === 0;

          return (
            <Pressable
              key={method.id}
              onPress={() => setShippingMethod(method.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${method.label}, ${isFree ? 'offert' : formatPrice(price)}`}
              style={({ pressed }) => [
                styles.option,
                active ? styles.optionActive : null,
                pressed ? { opacity: 0.92 } : null,
              ]}
            >
              <View style={[styles.iconBox, active ? styles.iconBoxActive : null]}>
                <Ionicons
                  name={method.icon as never}
                  size={20}
                  color={active ? colors.white : colors.inkSoft}
                />
              </View>

              <View style={styles.optionBody}>
                <View style={styles.optionHeader}>
                  <AppText variant="bodyStrong">{method.label}</AppText>

                  <AppText variant="bodyStrong" color={isFree ? colors.success : colors.ink}>
                    {isFree ? 'Offerte' : formatPrice(price)}
                  </AppText>
                </View>

                <AppText variant="caption">{method.description}</AppText>

                <View style={styles.etaRow}>
                  <Ionicons name="time-outline" size={13} color={colors.muted} />
                  <AppText variant="micro" color={colors.muted}>
                    {method.eta}
                  </AppText>

                  {method.id === 'standard' && isFree ? (
                    <Badge label={`Offerte dès ${formatPrice(FREE_SHIPPING_THRESHOLD)}`} tone="success" />
                  ) : null}
                </View>
              </View>

              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={active ? colors.primary : colors.mutedLight}
              />
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.recap}>
        <View style={styles.recapRow}>
          <AppText variant="caption">Sous-total</AppText>
          <AppText variant="captionStrong">{formatPrice(totals.subtotal)}</AppText>
        </View>

        <View style={styles.recapRow}>
          <AppText variant="caption">Livraison</AppText>
          <AppText variant="captionStrong">
            {totals.shippingCost === 0 ? 'Offerte' : formatPrice(totals.shippingCost)}
          </AppText>
        </View>

        {totals.discount > 0 ? (
          <View style={styles.recapRow}>
            <AppText variant="caption" color={colors.success}>
              Réduction
            </AppText>
            <AppText variant="captionStrong" color={colors.success}>
              -{formatPrice(totals.discount)}
            </AppText>
          </View>
        ) : null}

        <View style={[styles.recapRow, styles.recapTotal]}>
          <AppText variant="subheading">Total</AppText>
          <AppText variant="subheading">{formatPrice(totals.total)}</AppText>
        </View>
      </Card>
    </CheckoutShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: colors.primary },
  optionBody: { flex: 1, gap: 3 },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  recap: { gap: spacing.sm },
  recapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recapTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
});
