import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, Easing, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: ViewStyle;
}

/** Bloc de chargement animé (section 24 : skeleton loaders). */
export const Skeleton = ({ width = '100%', height = 14, rounded = radius.sm, style }: SkeletonProps) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: rounded,
          backgroundColor: colors.surfaceSunken,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
        },
        style,
      ]}
    />
  );
};

/** Silhouette d'une carte produit, affichée pendant le chargement de la grille. */
export const ProductCardSkeleton = ({ width }: { width: number }) => (
  <View style={[styles.card, { width }]}>
    <Skeleton height={width * 0.92} rounded={radius.md} />
    <Skeleton width="45%" height={10} />
    <Skeleton width="85%" height={13} />
    <Skeleton width="60%" height={16} />
  </View>
);

export const ProductGridSkeleton = ({ cardWidth, count = 6 }: { cardWidth: number; count?: number }) => (
  <View style={styles.grid}>
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} width={cardWidth} />
    ))}
  </View>
);

export const ListSkeleton = ({ count = 4, height = 78 }: { count?: number; height?: number }) => (
  <View style={{ gap: spacing.md }}>
    {Array.from({ length: count }).map((_, index) => (
      <Skeleton key={index} height={height} rounded={radius.lg} />
    ))}
  </View>
);

export const TextBlockSkeleton = ({ lines = 3 }: { lines?: number }) => (
  <View style={{ gap: spacing.sm }}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton key={index} width={index === lines - 1 ? '65%' : '100%'} height={13} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
});
