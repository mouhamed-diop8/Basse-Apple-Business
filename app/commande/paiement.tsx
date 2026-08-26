import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { AppText, Badge, Card, Input } from '@/components/ui';
import { db } from '@/data';
import { PAYMENT_METHODS } from '@/data/constants';
import { useCheckoutStore } from '@/store/checkout';
import { colors, radius, spacing } from '@/theme';
import {
  formatCardNumber,
  formatExpiry,
  isValidCardNumber,
  isValidCvc,
  isValidExpiry,
  isValidPhone,
} from '@/utils/validation';

export default function CheckoutPaymentScreen() {
  const router = useRouter();

  const method = useCheckoutStore((state) => state.paymentMethod);
  const setMethod = useCheckoutStore((state) => state.setPaymentMethod);
  const card = useCheckoutStore((state) => state.card);
  const setCard = useCheckoutStore((state) => state.setCard);
  const mobileNumber = useCheckoutStore((state) => state.mobileNumber);
  const setMobileNumber = useCheckoutStore((state) => state.setMobileNumber);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const validate = (): boolean => {
    if (method === 'card') {
      const next = {
        number: !isValidCardNumber(card.number) ? 'Numéro de carte invalide.' : undefined,
        holder: !card.holder.trim() ? 'Le nom du titulaire est obligatoire.' : undefined,
        expiry: !isValidExpiry(card.expiry) ? 'Date d’expiration invalide.' : undefined,
        cvc: !isValidCvc(card.cvc) ? 'Code de sécurité invalide.' : undefined,
      };

      setErrors(next);
      return !Object.values(next).some(Boolean);
    }

    if (method === 'mobile_money') {
      const next = {
        mobile: !isValidPhone(mobileNumber)
          ? 'Indiquez le numéro associé à votre compte mobile.'
          : undefined,
      };

      setErrors(next);
      return !next.mobile;
    }

    setErrors({});
    return true;
  };

  return (
    <CheckoutShell
      step={3}
      title="Moyen de paiement"
      subtitle="Le paiement n’est débité qu’après votre confirmation à l’étape suivante."
      ctaLabel="Voir le récapitulatif"
      onContinue={() => {
        if (validate()) router.push('/commande/recapitulatif');
      }}
    >
      {db.mode === 'demo' ? (
        <Card style={styles.demoNotice}>
          <AppText variant="captionStrong">Paiement de démonstration</AppText>
          <AppText variant="caption">
            Aucun débit réel n’est effectué. En boutique, réglez par Orange Money, Wave, Free Money,
            carte ou à la livraison.
          </AppText>
        </Card>
      ) : null}

      <View style={styles.list}>
        {PAYMENT_METHODS.map((option) => {
          const active = option.id === method;
          const disabled = !option.available;

          return (
            <Pressable
              key={option.id}
              onPress={() => !disabled && setMethod(option.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              style={({ pressed }) => [
                styles.option,
                active ? styles.optionActive : null,
                disabled ? styles.optionDisabled : null,
                pressed && !disabled ? { opacity: 0.92 } : null,
              ]}
            >
              <View style={[styles.iconBox, active ? styles.iconBoxActive : null]}>
                <Ionicons
                  name={option.icon as never}
                  size={20}
                  color={active ? colors.white : disabled ? colors.mutedLight : colors.inkSoft}
                />
              </View>

              <View style={styles.optionBody}>
                <AppText variant="bodyStrong" color={disabled ? colors.mutedLight : colors.ink}>
                  {option.label}
                </AppText>
                <AppText variant="caption">{option.description}</AppText>
              </View>

              {disabled ? (
                <Badge label="Bientôt" tone="neutral" />
              ) : (
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? colors.primary : colors.mutedLight}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {method === 'card' ? (
        <Card style={styles.form}>
          <View style={styles.secureNotice}>
            <Ionicons name="lock-closed" size={14} color={colors.success} />
            <AppText variant="micro" color={colors.success}>
              Vos données de carte ne sont ni enregistrées ni transmises à notre base.
            </AppText>
          </View>

          <Input
            label="Numéro de carte"
            required
            value={card.number}
            onChangeText={(value) => setCard({ number: formatCardNumber(value) })}
            error={errors.number}
            keyboardType="number-pad"
            icon="card-outline"
            placeholder="4242 4242 4242 4242"
            maxLength={23}
          />

          <Input
            label="Titulaire de la carte"
            required
            value={card.holder}
            onChangeText={(value) => setCard({ holder: value })}
            error={errors.holder}
            autoCapitalize="characters"
            placeholder="CAMILLE BERNARD"
          />

          <View style={styles.row}>
            <Input
              label="Expiration"
              required
              value={card.expiry}
              onChangeText={(value) => setCard({ expiry: formatExpiry(value) })}
              error={errors.expiry}
              keyboardType="number-pad"
              placeholder="MM/AA"
              maxLength={5}
              containerStyle={styles.half}
            />

            <Input
              label="Code de sécurité"
              required
              value={card.cvc}
              onChangeText={(value) => setCard({ cvc: value.replace(/\D/g, '').slice(0, 4) })}
              error={errors.cvc}
              keyboardType="number-pad"
              placeholder="123"
              maxLength={4}
              password
              containerStyle={styles.half}
            />
          </View>
        </Card>
      ) : null}

      {method === 'mobile_money' ? (
        <Card style={styles.form}>
          <Input
            label="Numéro mobile money"
            required
            value={mobileNumber}
            onChangeText={setMobileNumber}
            error={errors.mobile}
            keyboardType="phone-pad"
            icon="phone-portrait-outline"
            hint="Vous recevrez une demande de validation sur ce numéro."
          />
        </Card>
      ) : null}

      {method === 'cash_on_delivery' ? (
        <Card style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <AppText variant="caption" style={styles.infoText}>
            Vous réglerez le montant exact au livreur, en espèces, à la réception du colis.
            Pensez à préparer l’appoint.
          </AppText>
        </Card>
      ) : null}
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
  optionDisabled: { opacity: 0.6 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: colors.primary },
  optionBody: { flex: 1, gap: 2 },
  form: { gap: spacing.lg },
  secureNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  infoCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  infoText: { flex: 1 },
  demoNotice: { gap: spacing.xs, backgroundColor: colors.warningSoft },
});
