import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { STORE } from '@/data/constants';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cartItemCount, useCartStore } from '@/store/cart';
import { useUnreadCount } from '@/store/notifications';
import { colors, layout, radius, spacing } from '@/theme';

const HeaderAction = ({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={6}
    style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
  >
    <Ionicons name={icon} size={20} color={colors.ink} />

    {badge && badge > 0 ? (
      <View style={styles.badge}>
        <AppText variant="micro" color={colors.white} style={styles.badgeText}>
          {badge > 9 ? '9+' : badge}
        </AppText>
      </View>
    ) : null}
  </Pressable>
);

/** En-tête de l'accueil : logo, nom de boutique, recherche et raccourcis. */
export const StoreHeader = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDesktop, screenPadding } = useBreakpoint();
  const cartCount = useCartStore((state) => cartItemCount(state.lines));
  const unread = useUnreadCount();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={[styles.inner, { paddingHorizontal: screenPadding }]}>
        <Pressable
          onPress={() => router.push('/')}
          accessibilityRole="button"
          accessibilityLabel={`${STORE.name}, accueil`}
          style={styles.brand}
        >
          <View style={styles.logo}>
            <Ionicons name="logo-apple" size={18} color={colors.white} />
          </View>

          <View style={styles.brandText}>
            <AppText variant={isDesktop ? 'heading' : 'bodyStrong'} numberOfLines={2}>
              {STORE.name}
            </AppText>
            <AppText variant="micro" color={colors.muted} numberOfLines={1}>
              Dakar · Keur Massar
            </AppText>
          </View>
        </Pressable>

        {isDesktop ? (
          <Pressable
            onPress={() => router.push('/recherche')}
            accessibilityRole="button"
            accessibilityLabel="Rechercher un produit"
            style={({ pressed }) => [styles.search, pressed ? styles.pressed : null]}
          >
            <Ionicons name="search-outline" size={18} color={colors.muted} />
            <AppText variant="caption" color={colors.mutedLight} style={styles.searchPlaceholder}>
              Rechercher un iPhone, un MacBook…
            </AppText>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          {isDesktop ? null : (
            <HeaderAction
              icon="search-outline"
              label="Rechercher un produit"
              onPress={() => router.push('/recherche')}
            />
          )}
          <HeaderAction
            icon="notifications-outline"
            label="Notifications"
            badge={unread}
            onPress={() => router.push('/notifications')}
          />
          <HeaderAction
            icon="bag-outline"
            label="Panier"
            badge={cartCount}
            onPress={() => router.push('/panier')}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1, minWidth: 0 },
  brandText: { flexShrink: 1, minWidth: 0, gap: 1 },
  logo: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flex: 1,
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  action: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceSunken },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: { fontSize: 9, lineHeight: 11 },
});
