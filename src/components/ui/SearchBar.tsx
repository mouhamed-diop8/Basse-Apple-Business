import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  /** Bouton à droite, typiquement l'ouverture des filtres. */
  onFilterPress?: () => void;
  activeFilterCount?: number;
}

export const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Rechercher un iPhone, un MacBook…',
  onSubmit,
  autoFocus = false,
  onFilterPress,
  activeFilterCount = 0,
}: SearchBarProps) => (
  <View style={styles.row}>
    <View style={styles.field}>
      <Ionicons name="search" size={18} color={colors.muted} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
        style={styles.input}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Champ de recherche"
        clearButtonMode="never"
      />

      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
        >
          <Ionicons name="close-circle" size={18} color={colors.mutedLight} />
        </Pressable>
      ) : null}
    </View>

    {onFilterPress ? (
      <Pressable
        onPress={onFilterPress}
        accessibilityRole="button"
        accessibilityLabel="Filtres"
        style={({ pressed }) => [
          styles.filterButton,
          activeFilterCount > 0 ? styles.filterActive : null,
          pressed ? { opacity: 0.85 } : null,
        ]}
      >
        <Ionicons
          name="options-outline"
          size={20}
          color={activeFilterCount > 0 ? colors.white : colors.ink}
        />
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: fontSize.md, color: colors.ink, padding: 0 },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActive: { backgroundColor: colors.black, borderColor: colors.black },
});
