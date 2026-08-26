import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius, shadow } from '@/theme';
import { useFavoritesStore } from '@/store/favorites';
import { toast } from '@/store/toast';

interface HeartButtonProps {
  productId: string;
  size?: number;
  /** Fond blanc translucide, pour superposition sur une image. */
  floating?: boolean;
  style?: ViewStyle;
}

export const HeartButton = ({ productId, size = 20, floating = true, style }: HeartButtonProps) => {
  const isFavorite = useFavoritesStore((state) => state.ids.includes(productId));
  const toggle = useFavoritesStore((state) => state.toggle);
  const scale = useRef(new Animated.Value(1)).current;
  const mounted = useRef(false);

  // L'animation ne doit pas se déclencher au premier rendu, seulement au clic.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    Animated.sequence([
      Animated.spring(scale, { toValue: 1.28, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  }, [isFavorite, scale]);

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => undefined);
    }

    const added = await toggle(productId);
    toast.success(added ? 'Ajouté à vos favoris' : 'Retiré de vos favoris');
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      accessibilityState={{ selected: isFavorite }}
      style={[floating ? styles.floating : styles.plain, floating ? shadow.xs : null, style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorite ? colors.danger : colors.inkSoft}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  floating: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: { padding: 4 },
});
