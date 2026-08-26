import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Sheet } from '@/components/ui';
import { SortOption } from '@/data/types';
import { colors, radius, spacing } from '@/theme';

export const SORT_OPTIONS: { id: SortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'relevance', label: 'Pertinence', icon: 'sparkles-outline' },
  { id: 'price_asc', label: 'Prix croissant', icon: 'arrow-up-outline' },
  { id: 'price_desc', label: 'Prix décroissant', icon: 'arrow-down-outline' },
  { id: 'popular', label: 'Plus populaires', icon: 'flame-outline' },
  { id: 'rating', label: 'Mieux notés', icon: 'star-outline' },
  { id: 'newest', label: 'Nouveautés', icon: 'time-outline' },
  { id: 'promo', label: 'Promotions', icon: 'pricetag-outline' },
];

export const sortLabel = (sort: SortOption): string =>
  SORT_OPTIONS.find((option) => option.id === sort)?.label ?? 'Pertinence';

export const SortSheet = ({
  visible,
  onClose,
  value,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  value: SortOption;
  onChange: (sort: SortOption) => void;
}) => (
  <Sheet visible={visible} onClose={onClose} title="Trier par">
    <View style={styles.list}>
      {SORT_OPTIONS.map((option) => {
        const selected = option.id === value;

        return (
          <Pressable
            key={option.id}
            onPress={() => {
              onChange(option.id);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.row,
              selected ? styles.rowSelected : null,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Ionicons
              name={option.icon}
              size={19}
              color={selected ? colors.primary : colors.inkSoft}
            />

            <AppText variant="bodyStrong" color={selected ? colors.primary : colors.ink} style={styles.label}>
              {option.label}
            </AppText>

            {selected ? <Ionicons name="checkmark" size={19} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  </Sheet>
);

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  rowSelected: { backgroundColor: colors.primarySoft },
  label: { flex: 1 },
});
