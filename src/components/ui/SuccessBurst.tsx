import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, motion, radius } from '@/theme';

/**
 * Animation de succès : pastille qui pop, puis deux anneaux qui s’élargissent.
 */
export const SuccessBurst = () => {
  const pop = useRef(new Animated.Value(0)).current;
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pop, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.back(1.55)),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(ringA, {
          toValue: 1,
          duration: motion.slow,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ringB, {
          toValue: 1,
          duration: 820,
          delay: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [pop, ringA, ringB]);

  const ringStyle = (anim: Animated.Value, size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [
      {
        scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.55] }),
      },
    ],
  });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.ring, ringStyle(ringA, 82)]} />
      <Animated.View style={[styles.ring, ringStyle(ringB, 82)]} />
      <Animated.View
        style={[
          styles.badge,
          {
            opacity: pop,
            transform: [
              {
                scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="checkmark" size={44} color={colors.white} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.success,
  },
  badge: {
    width: 82,
    height: 82,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
