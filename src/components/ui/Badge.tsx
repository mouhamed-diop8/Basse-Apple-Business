import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'dark';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceSunken, fg: colors.inkSoft },
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  dark: { bg: colors.black, fg: colors.white },
};

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const Badge = ({ label, tone = 'neutral', icon, style }: BadgeProps) => {
  const palette = TONES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      {icon ? <Ionicons name={icon} size={11} color={palette.fg} /> : null}
      <AppText variant="micro" color={palette.fg}>
        {label}
      </AppText>
    </View>
  );
};

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Affiche une croix pour retirer un filtre actif. */
  removable?: boolean;
  style?: ViewStyle;
}

export const Chip = ({ label, selected = false, onPress, icon, removable, style }: ChipProps) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
    style={({ pressed }) => [
      styles.chip,
      selected ? styles.chipSelected : null,
      pressed ? { opacity: 0.85 } : null,
      style,
    ]}
  >
    {icon ? (
      <Ionicons name={icon} size={14} color={selected ? colors.white : colors.inkSoft} />
    ) : null}

    <AppText variant="captionStrong" color={selected ? colors.white : colors.inkSoft}>
      {label}
    </AppText>

    {removable ? (
      <Ionicons name="close" size={14} color={selected ? colors.white : colors.muted} />
    ) : null}
  </Pressable>
);

/** Pastille de couleur utilisée pour choisir un coloris de produit. */
export const ColorDot = ({
  hex,
  selected,
  onPress,
  label,
}: {
  hex: string;
  selected: boolean;
  onPress: () => void;
  label: string;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`Couleur ${label}`}
    accessibilityState={{ selected }}
    style={[styles.colorDotOuter, selected ? styles.colorDotSelected : null]}
  >
    <View style={[styles.colorDot, { backgroundColor: hex }]} />
  </Pressable>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipSelected: { backgroundColor: colors.black, borderColor: colors.black },
  colorDotOuter: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: { borderColor: colors.ink },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
