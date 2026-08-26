import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, ScreenHeader, Stepper } from '@/components/ui';
import { useCartTotals } from '@/store/cart';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { colors, layout, shadow, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

export const CHECKOUT_STEPS = [
  'Informations',
  'Adresse',
  'Livraison',
  'Paiement',
  'Confirmation',
];

interface CheckoutShellProps {
  /** Index de l'étape, à partir de 0. */
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  ctaLabel: string;
  onContinue: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  ctaIcon?: React.ComponentProps<typeof Button>['icon'];
}

/**
 * Squelette commun aux 5 étapes du tunnel : même en-tête, même fil d'Ariane et
 * même barre d'action, pour que l'utilisateur ne soit jamais désorienté.
 */
export const CheckoutShell = ({
  step,
  title,
  subtitle,
  children,
  ctaLabel,
  onContinue,
  ctaDisabled = false,
  ctaLoading = false,
  ctaIcon = 'arrow-forward',
}: CheckoutShellProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const totals = useCartTotals();
  const { screenPadding } = useBreakpoint();

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Commande"
        subtitle={`${totals.count} article${totals.count > 1 ? 's' : ''} · ${formatPrice(totals.total)}`}
        withStatusBar
        onBack={() => (step === 0 ? router.push('/panier') : router.back())}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { padding: screenPadding, paddingBottom: 120 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Stepper steps={CHECKOUT_STEPS} current={step} />

          <View style={styles.heading}>
            <AppText variant="heading">{title}</AppText>
            {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.bar,
          shadow.lg,
          { paddingBottom: insets.bottom + spacing.md, paddingHorizontal: screenPadding },
        ]}
      >
        <View style={styles.barInner}>
          <Button
            label={ctaLabel}
            iconRight={ctaIcon}
            onPress={onContinue}
            disabled={ctaDisabled}
            loading={ctaLoading}
            haptic
            fullWidth
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  content: {
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  heading: { gap: 2 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  barInner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
});
