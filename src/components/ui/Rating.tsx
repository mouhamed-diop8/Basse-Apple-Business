import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { formatNumber } from '@/utils/format';
import { AppText } from './AppText';

interface RatingProps {
  value: number;
  count?: number;
  size?: number;
  showValue?: boolean;
  compact?: boolean;
}

export const Rating = ({ value, count, size = 13, showValue = true, compact = false }: RatingProps) => {
  const rounded = Math.round(value * 2) / 2;

  return (
    <View style={styles.row}>
      {compact ? (
        <Ionicons name="star" size={size} color={colors.star} />
      ) : (
        [1, 2, 3, 4, 5].map((index) => {
          const name =
            rounded >= index ? 'star' : rounded >= index - 0.5 ? 'star-half' : 'star-outline';
          return <Ionicons key={index} name={name} size={size} color={colors.star} />;
        })
      )}

      {showValue ? (
        <AppText variant="micro" color={colors.inkSoft}>
          {value.toFixed(1)}
        </AppText>
      ) : null}

      {count !== undefined ? (
        <AppText variant="micro" color={colors.mutedLight}>
          ({formatNumber(count)})
        </AppText>
      ) : null}
    </View>
  );
};

/** Sélecteur de note utilisé dans le formulaire d'avis. */
export const RatingPicker = ({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}) => (
  <View style={styles.pickerRow}>
    {[1, 2, 3, 4, 5].map((index) => (
      <Pressable
        key={index}
        onPress={() => onChange(index)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Noter ${index} sur 5`}
      >
        <Ionicons
          name={value >= index ? 'star' : 'star-outline'}
          size={size}
          color={value >= index ? colors.star : colors.mutedLight}
        />
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pickerRow: { flexDirection: 'row', gap: spacing.sm },
});
