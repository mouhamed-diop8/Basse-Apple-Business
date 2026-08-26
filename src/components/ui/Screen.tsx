import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import {
  Pressable,
  RefreshControlProps,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ScreenProps {
  children: ReactNode;
  /** Encapsule le contenu dans un ScrollView (désactiver pour les listes). */
  scroll?: boolean;
  padded?: boolean;
  background?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Espace réservé en bas pour une barre d'action fixe. */
  bottomInset?: number;
  onScroll?: React.ComponentProps<typeof ScrollView>['onScroll'];
}

/**
 * Conteneur d'écran. Centre le contenu au-delà de `maxContentWidth` pour que
 * la version web et les tablettes restent lisibles (section 25).
 */
export const Screen = ({
  children,
  scroll = false,
  padded = true,
  background = colors.surfaceAlt,
  style,
  contentStyle,
  refreshControl,
  bottomInset = 0,
  onScroll,
}: ScreenProps) => {
  const { screenPadding } = useBreakpoint();
  const padding = screenPadding;

  const inner: ViewStyle = {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: padded ? padding : 0,
  };

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: background }, style]}>
        <View style={[styles.flex, inner, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: background }, style]}
      contentContainerStyle={[inner, { paddingBottom: bottomInset + spacing.xxxl }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {children}
    </ScrollView>
  );
};

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  /** Ajoute la marge de statut : à utiliser hors navigation native. */
  withStatusBar?: boolean;
  transparent?: boolean;
}

export const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  right,
  withStatusBar = false,
  transparent = false,
}: ScreenHeaderProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        transparent ? null : styles.headerSolid,
        withStatusBar ? { paddingTop: insets.top + spacing.sm } : null,
      ]}
    >
      <View style={styles.headerInner}>
        <View style={styles.headerSide}>
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.headerCenter}>
          <AppText variant="subheading" numberOfLines={1} center>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="micro" center numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
      </View>
    </View>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: SectionHeaderProps) => (
  <View style={[styles.section, style]}>
    <View style={styles.sectionText}>
      <AppText variant="heading">{title}</AppText>
      {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
    </View>

    {actionLabel && onAction ? (
      <Pressable
        onPress={onAction}
        hitSlop={8}
        accessibilityRole="button"
        style={({ pressed }) => [styles.sectionAction, pressed ? styles.pressed : null]}
      >
        <AppText variant="captionStrong" color={colors.primary}>
          {actionLabel}
        </AppText>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.headerHeight,
    gap: spacing.sm,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  headerSolid: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerSide: { minWidth: 44, flexDirection: 'row', alignItems: 'center' },
  headerRight: { justifyContent: 'flex-end', gap: spacing.xs },
  headerCenter: { flex: 1, gap: 1 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6, backgroundColor: colors.surfaceSunken },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionText: { flex: 1, gap: 2 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
});
