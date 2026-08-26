import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Category } from '@/data/types';
import { colors, radius, shadow, spacing } from '@/theme';
import { categoryIcon } from '@/utils/visuals';

interface CategoryCardProps {
  category: Category;
  /** `tile` pour la grille de la page Catégories, `pill` pour l'accueil. */
  layout?: 'tile' | 'pill';
  count?: number;
  width?: number;
}

export const CategoryCard = ({ category, layout = 'pill', count, width }: CategoryCardProps) => {
  const router = useRouter();
  const icon = categoryIcon(category.id, (category.icon as never) ?? 'cube-outline');

  const onPress = () => router.push(`/catalogue?categorie=${category.id}` as never);

  if (layout === 'pill') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={category.name}
        style={({ pressed }) => [styles.pill, pressed ? styles.pressed : null]}
      >
        <View style={styles.pillIcon}>
          <Ionicons name={icon} size={22} color={colors.ink} />
        </View>

        <AppText variant="micro" color={colors.inkSoft} numberOfLines={1} center>
          {category.name}
        </AppText>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={category.name}
      style={({ pressed }) => [
        styles.tile,
        shadow.sm,
        width ? { width } : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={26} color={colors.ink} />
      </View>

      <View style={styles.tileBody}>
        <AppText variant="captionStrong" numberOfLines={1}>
          {category.name}
        </AppText>

        <AppText variant="micro" color={colors.muted} numberOfLines={2}>
          {count !== undefined ? `${count} produit${count > 1 ? 's' : ''}` : category.description}
        </AppText>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.mutedLight} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  pill: { width: 76, alignItems: 'center', gap: spacing.xs },
  pillIcon: {
    width: 62,
    height: 62,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexGrow: 1,
    flexBasis: 280,
    minWidth: 240,
  },
  tileIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBody: { flex: 1, gap: 2 },
});
