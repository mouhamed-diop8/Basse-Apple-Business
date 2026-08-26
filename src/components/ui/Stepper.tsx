import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { AppText } from './AppText';

interface StepperProps {
  steps: string[];
  /** Index de l'étape courante, à partir de 0. */
  current: number;
}

/** Fil d'Ariane du tunnel de commande (section 8). */
export const Stepper = ({ steps, current }: StepperProps) => {
  const { isCompact } = useBreakpoint();

  return (
  <View style={styles.container}>
    <View style={styles.track}>
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <View key={label} style={styles.stepWrapper}>
            {index > 0 ? (
              <View
                style={[
                  styles.connector,
                  isCompact ? styles.connectorCompact : null,
                  done || active ? styles.connectorDone : null,
                ]}
              />
            ) : null}

            <View
              style={[
                styles.dot,
                done ? styles.dotDone : null,
                active ? styles.dotActive : null,
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={13} color={colors.white} />
              ) : (
                <AppText
                  variant="micro"
                  color={active ? colors.white : colors.mutedLight}
                >
                  {index + 1}
                </AppText>
              )}
            </View>
          </View>
        );
      })}
    </View>

    <AppText variant="captionStrong" center>
      Étape {Math.min(current + 1, steps.length)} sur {steps.length} — {steps[Math.min(current, steps.length - 1)]}
    </AppText>
  </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingVertical: spacing.md },
  track: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  stepWrapper: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  connector: { width: 34, height: 2, backgroundColor: colors.border, flexShrink: 1 },
  connectorCompact: { width: 14, minWidth: 10 },
  connectorDone: { backgroundColor: colors.primary },
  dot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotActive: { backgroundColor: colors.black, borderColor: colors.black },
});
