import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

interface QuantityStepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  max?: number;
  min?: number;
  compact?: boolean;
}

export const QuantityStepper = ({
  value,
  onIncrement,
  onDecrement,
  max = Infinity,
  min = 1,
  compact = false,
}: QuantityStepperProps) => {
  const size = compact ? 30 : 34;

  return (
    <View style={[styles.container, compact ? styles.compact : null]}>
      <Pressable
        onPress={onDecrement}
        disabled={value <= min}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Diminuer la quantité"
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size },
          value <= min ? styles.disabled : null,
          pressed && value > min ? styles.pressed : null,
        ]}
      >
        <Ionicons name="remove" size={16} color={value <= min ? colors.mutedLight : colors.ink} />
      </Pressable>

      <AppText variant="bodyStrong" style={styles.value}>
        {value}
      </AppText>

      <Pressable
        onPress={onIncrement}
        disabled={value >= max}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Augmenter la quantité"
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size },
          value >= max ? styles.disabled : null,
          pressed && value < max ? styles.pressed : null,
        ]}
      >
        <Ionicons name="add" size={16} color={value >= max ? colors.mutedLight : colors.ink} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignSelf: 'flex-start',
  },
  compact: { padding: 2 },
  button: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceSunken },
  disabled: { backgroundColor: colors.surfaceAlt },
  value: { minWidth: 26, textAlign: 'center' },
});
