import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme';
import { AppText } from './AppText';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  onPress?: () => void;
  elevated?: boolean;
}

export const Card = ({ children, style, padded = true, onPress, elevated = true }: CardProps) => {
  const content = (
    <View
      style={[
        styles.card,
        elevated ? shadow.sm : null,
        padded ? { padding: spacing.lg } : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {content}
    </Pressable>
  );
};

export const Divider = ({ style }: { style?: ViewStyle }) => <View style={[styles.divider, style]} />;

interface ListRowProps {
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  badge?: number;
}

/** Ligne de liste réutilisée dans le profil, les paramètres et l'espace admin. */
export const ListRow = ({
  label,
  description,
  icon,
  iconColor,
  value,
  onPress,
  right,
  destructive = false,
  badge,
}: ListRowProps) => {
  const tint = destructive ? colors.danger : (iconColor ?? colors.ink);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
    >
      {icon ? (
        <View style={[styles.rowIcon, destructive ? { backgroundColor: colors.dangerSoft } : null]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
      ) : null}

      <View style={styles.rowBody}>
        <AppText variant="bodyStrong" color={destructive ? colors.danger : colors.ink}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" numberOfLines={2}>
            {description}
          </AppText>
        ) : null}
      </View>

      {badge !== undefined && badge > 0 ? (
        <View style={styles.rowBadge}>
          <AppText variant="micro" color={colors.white}>
            {badge > 99 ? '99+' : badge}
          </AppText>
        </View>
      ) : null}

      {value ? <AppText variant="caption">{value}</AppText> : null}
      {right}

      {onPress && !right ? (
        <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  divider: { height: 1, backgroundColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 58,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
