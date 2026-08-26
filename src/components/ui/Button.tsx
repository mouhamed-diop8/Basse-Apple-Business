import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  /** Retour haptique léger, réservé aux actions engageantes (ajout, paiement). */
  haptic?: boolean;
}

const HEIGHTS: Record<Size, number> = { sm: 38, md: 48, lg: 54 };

const PALETTE: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: colors.primarySoft, fg: colors.primary },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: colors.primary },
  danger: { bg: colors.danger, fg: colors.white },
  dark: { bg: colors.black, fg: colors.white },
};

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  haptic = false,
}: ButtonProps) => {
  const palette = PALETTE[variant];
  const inactive = disabled || loading;

  const handlePress = () => {
    if (inactive) return;
    if (haptic && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: palette.bg,
          borderColor: palette.border ?? 'transparent',
          borderWidth: palette.border ? 1 : 0,
          opacity: inactive ? 0.5 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
        },
        variant === 'primary' || variant === 'dark' ? shadow.xs : null,
        fullWidth ? { alignSelf: 'stretch' } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={palette.fg} /> : null}
          <AppText
            variant={size === 'sm' ? 'captionStrong' : 'bodyStrong'}
            color={palette.fg}
            numberOfLines={1}
          >
            {label}
          </AppText>
          {iconRight ? (
            <Ionicons name={iconRight} size={size === 'sm' ? 16 : 19} color={palette.fg} />
          ) : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
});
