import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cartItemCount, useCartStore } from '@/store/cart';
import { colors, radius, spacing } from '@/theme';

/** Pastille du nombre d'articles, affichée sur l'onglet Panier (section 3). */
const CartBadge = ({ count }: { count: number }) => {
  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <AppText variant="micro" color={colors.white} style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </AppText>
    </View>
  );
};

export default function TabsLayout() {
  const count = useCartStore((state) => cartItemCount(state.lines));
  const { isDesktop, screenPadding } = useBreakpoint();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktop ? 'top' : 'bottom',
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mutedLight,
        tabBarLabelStyle: [styles.label, isDesktop ? styles.labelDesktop : null],
        tabBarStyle: isDesktop
          ? [styles.tabBarDesktop, { paddingHorizontal: screenPadding }]
          : styles.tabBar,
        tabBarItemStyle: isDesktop ? styles.itemDesktop : styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: 'Catégories',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="recherche"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="commandes"
        options={{
          title: 'Commandes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="panier"
        options={{
          title: 'Panier',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'bag' : 'bag-outline'} size={22} color={color} />
              <CartBadge count={count} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.select({ ios: 84, default: 64 }),
    paddingTop: spacing.sm,
    paddingBottom: Platform.select({ ios: spacing.xxl, default: spacing.sm }),
  },
  tabBarDesktop: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopWidth: 0,
    height: 64,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  item: { paddingVertical: 2 },
  itemDesktop: { paddingVertical: 4 },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  labelDesktop: { fontSize: 12, marginTop: 0 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -11,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: { fontSize: 9, lineHeight: 12 },
});
